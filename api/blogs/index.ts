import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

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
    const tagId = url.searchParams.get('tagId');
    const search = url.searchParams.get('search');
    const featured = url.searchParams.get('featured');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const conditions = [eq(schema.blogs.status, 'published')];

    if (search) {
      conditions.push(
        sql`(${schema.blogs.title} ILIKE ${`%${search}%`} OR ${schema.blogs.excerpt} ILIKE ${`%${search}%`})`
      );
    }

    if (featured === 'true') {
      conditions.push(eq(schema.blogs.isFeatured, true));
    }

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
      .where(and(...conditions))
      .orderBy(desc(schema.blogs.publishedAt))
      .limit(limit)
      .offset(offset);

    // Get tags for each blog
    const blogIds = result.map((r) => r.blog.id);
    const blogTagsMap: Record<string, schema.Tag[]> = {};

    if (blogIds.length > 0) {
      const blogTagsResult = await db
        .select({
          blogId: schema.blogTags.blogId,
          tag: schema.tags,
        })
        .from(schema.blogTags)
        .innerJoin(schema.tags, eq(schema.blogTags.tagId, schema.tags.id))
        .where(inArray(schema.blogTags.blogId, blogIds));

      blogTagsResult.forEach((bt) => {
        if (!blogTagsMap[bt.blogId]) blogTagsMap[bt.blogId] = [];
        blogTagsMap[bt.blogId].push(bt.tag);
      });
    }

    // Filter by tag if specified
    let data = result.map((r) => ({
      ...r.blog,
      creator: r.creator,
      tags: blogTagsMap[r.blog.id] || [],
    }));

    if (tagId) {
      data = data.filter((blog) => blog.tags.some((t: schema.Tag) => t.id === tagId));
    }

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
