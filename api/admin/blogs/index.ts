import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../../../src/db/schema';
import { eq, desc } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      let query = db.select().from(schema.blogs);
      
      if (status) {
        query = query.where(eq(schema.blogs.status, status as any)) as any;
      }

      const result = await query.orderBy(desc(schema.blogs.createdAt)).limit(limit);

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      console.error('Error fetching blogs:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const {
        title,
        excerpt,
        content,
        bannerUrl,
        isFeatured = false,
        status = 'draft',
        tagIds = [],
      } = body;

      if (!title) {
        return new Response(JSON.stringify({ error: 'Title is required' }), {
          status: 400,
          headers,
        });
      }

      const slug = generateSlug(title);
      const readTime = content ? calculateReadTime(content) : 0;

      // Upload content to Supabase storage
      let contentPath: string | null = null;
      if (content) {
        const path = `${slug}/content.md`;
        const { error: uploadError } = await supabase.storage
          .from('blogs')
          .upload(path, content, {
            contentType: 'text/markdown',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading content:', uploadError);
          return new Response(JSON.stringify({ error: 'Failed to upload content' }), {
            status: 500,
            headers,
          });
        }
        contentPath = path;
      }

      const [blog] = await db
        .insert(schema.blogs)
        .values({
          title,
          slug,
          excerpt,
          contentPath,
          bannerUrl,
          isFeatured,
          readTime,
          status,
          publishedAt: status === 'published' ? new Date() : null,
          createdBy: userId,
        })
        .returning();

      // Add tags
      if (tagIds.length > 0) {
        await db.insert(schema.blogTags).values(
          tagIds.map((tagId: string) => ({ blogId: blog.id, tagId }))
        );
      }

      return new Response(JSON.stringify(blog), { status: 201, headers });
    } catch (error) {
      console.error('Error creating blog:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers,
  });
}

export const config = {
  runtime: 'edge',
};
