import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../../../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Path is /api/blogs/{slug} - get the last part
    const slug = pathParts[pathParts.length - 1];

    if (!slug || slug === 'blogs') {
      return new Response(JSON.stringify({ error: 'Slug required' }), {
        status: 400,
        headers,
      });
    }

    // Fetch blog with creator
    const result = await db
      .select({
        blog: schema.blogs,
        creator: {
          id: schema.users.id,
          name: schema.users.name,
          avatarUrl: schema.users.avatarUrl,
        },
      })
      .from(schema.blogs)
      .leftJoin(schema.users, eq(schema.blogs.createdBy, schema.users.id))
      .where(eq(schema.blogs.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Blog not found' }), {
        status: 404,
        headers,
      });
    }

    const { blog, creator } = result[0];

    // Only show published blogs to public
    if (blog.status !== 'published') {
      let userId: string;
      try {
        const user = await verifyAuth(req);
        userId = user.id;
      } catch {
        return new Response(JSON.stringify({ error: 'Blog not found' }), { status: 404, headers });
      }

      // Check if user is admin
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Blog not found' }), {
          status: 404,
          headers,
        });
      }
    }

    // Get tags
    const blogTagsResult = await db
      .select({ tag: schema.tags })
      .from(schema.blogTags)
      .innerJoin(schema.tags, eq(schema.blogTags.tagId, schema.tags.id))
      .where(eq(schema.blogTags.blogId, blog.id));

    const tags = blogTagsResult.map((bt) => bt.tag);

    // Fetch content from Supabase storage
    let content = '';
    if (blog.contentPath) {
      const { data, error } = await supabase.storage.from('blogs').download(blog.contentPath);

      if (!error && data) {
        content = await data.text();
      }
    }

    // Increment view count (fire and forget)
    db.update(schema.blogs)
      .set({ viewCount: sql`${schema.blogs.viewCount} + 1` })
      .where(eq(schema.blogs.id, blog.id))
      .execute()
      .catch(() => {});

    return new Response(
      JSON.stringify({
        ...blog,
        creator,
        tags,
        content,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching blog:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
