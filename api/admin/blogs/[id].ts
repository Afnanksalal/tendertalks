import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path is /api/admin/blogs/{id} - get the last part
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'blogs') {
    return new Response(JSON.stringify({ error: 'Blog ID required' }), { status: 400, headers });
  }

  // GET - Fetch single blog with content
  if (req.method === 'GET') {
    try {
      const [blog] = await db.select().from(schema.blogs).where(eq(schema.blogs.id, id)).limit(1);
      
      if (!blog) {
        return new Response(JSON.stringify({ error: 'Blog not found' }), { status: 404, headers });
      }

      // Get tags
      const blogTagsResult = await db
        .select({ tagId: schema.blogTags.tagId })
        .from(schema.blogTags)
        .where(eq(schema.blogTags.blogId, blog.id));

      const tagIds = blogTagsResult.map(bt => bt.tagId);

      // Fetch content from storage
      let content = '';
      if (blog.contentPath) {
        const { data, error } = await supabase.storage
          .from('blogs')
          .download(blog.contentPath);
        
        if (!error && data) {
          content = await data.text();
        }
      }

      return new Response(JSON.stringify({ ...blog, content, tagIds }), { status: 200, headers });
    } catch (error) {
      console.error('Error fetching blog:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
    }
  }

  // PATCH - Update blog
  if (req.method === 'PATCH') {
    try {
      const body = await req.json();
      const { title, excerpt, content, bannerUrl, isFeatured, status, tagIds } = body;

      const [existing] = await db.select().from(schema.blogs).where(eq(schema.blogs.id, id)).limit(1);
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Blog not found' }), { status: 404, headers });
      }

      const updates: any = { updatedAt: new Date() };

      if (title !== undefined) updates.title = title;
      if (excerpt !== undefined) updates.excerpt = excerpt;
      if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
      if (isFeatured !== undefined) updates.isFeatured = isFeatured;
      if (status !== undefined) {
        updates.status = status;
        if (status === 'published' && !existing.publishedAt) {
          updates.publishedAt = new Date();
        }
      }

      // Update content in storage
      if (content !== undefined) {
        const path = existing.contentPath || `${existing.slug}/content.md`;
        const { error: uploadError } = await supabase.storage
          .from('blogs')
          .upload(path, content, {
            contentType: 'text/markdown',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading content:', uploadError);
          return new Response(JSON.stringify({ error: 'Failed to upload content' }), { status: 500, headers });
        }
        updates.contentPath = path;
        updates.readTime = calculateReadTime(content);
      }

      const [blog] = await db
        .update(schema.blogs)
        .set(updates)
        .where(eq(schema.blogs.id, id))
        .returning();

      // Update tags
      if (tagIds !== undefined) {
        await db.delete(schema.blogTags).where(eq(schema.blogTags.blogId, id));
        if (tagIds.length > 0) {
          await db.insert(schema.blogTags).values(
            tagIds.map((tagId: string) => ({ blogId: id, tagId }))
          );
        }
      }

      return new Response(JSON.stringify(blog), { status: 200, headers });
    } catch (error) {
      console.error('Error updating blog:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
    }
  }

  // DELETE - Delete blog
  if (req.method === 'DELETE') {
    try {
      const [blog] = await db.select().from(schema.blogs).where(eq(schema.blogs.id, id)).limit(1);
      if (!blog) {
        return new Response(JSON.stringify({ error: 'Blog not found' }), { status: 404, headers });
      }

      // Delete content from storage
      if (blog.contentPath) {
        await supabase.storage.from('blogs').remove([blog.contentPath]);
      }

      // Delete banner if stored in our bucket
      if (blog.bannerUrl?.includes('blogs/')) {
        const bannerPath = blog.bannerUrl.split('blogs/')[1];
        if (bannerPath) {
          await supabase.storage.from('blogs').remove([bannerPath]);
        }
      }

      // Delete related records first (tags junction table)
      await db.delete(schema.blogTags).where(eq(schema.blogTags.blogId, id));

      // Delete the blog
      await db.delete(schema.blogs).where(eq(schema.blogs.id, id));

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (error) {
      console.error('Error deleting blog:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}

export const config = {
  runtime: 'edge',
};
