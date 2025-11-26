import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { merchItems } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const category = url.searchParams.get('category');

    const conditions = [eq(merchItems.isActive, true)];
    
    if (category && category !== 'all') {
      conditions.push(eq(merchItems.category, category as any));
    }

    const items = await db
      .select()
      .from(merchItems)
      .where(and(...conditions));

    console.log('Fetched merch items:', items.length);

    return new Response(JSON.stringify(items), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching merch:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
