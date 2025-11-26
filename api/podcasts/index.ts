import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { podcasts, categories, users } from '../../src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
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
    const categoryId = url.searchParams.get('categoryId');
    const isFree = url.searchParams.get('isFree');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const conditions = [eq(podcasts.status, 'published')];

    if (categoryId) {
      conditions.push(eq(podcasts.categoryId, categoryId));
    }

    if (isFree !== null && isFree !== '') {
      conditions.push(eq(podcasts.isFree, isFree === 'true'));
    }

    if (search) {
      conditions.push(
        sql`(${podcasts.title} ILIKE ${`%${search}%`} OR ${podcasts.description} ILIKE ${`%${search}%`})`
      );
    }

    const result = await db
      .select({
        podcast: podcasts,
        category: categories,
        creator: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(podcasts)
      .leftJoin(categories, eq(podcasts.categoryId, categories.id))
      .leftJoin(users, eq(podcasts.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(podcasts.publishedAt))
      .limit(limit)
      .offset(offset);

    const data = result.map((r) => ({
      ...r.podcast,
      category: r.category,
      creator: r.creator,
    }));

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
