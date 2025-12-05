import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifyAuth } from '../../api/utils/auth';

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

  const auth = await verifyAuth(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }
  const userId = auth.id;

  try {
    const result = await db
      .select({
        purchase: schema.purchases,
        podcast: schema.podcasts,
      })
      .from(schema.purchases)
      .innerJoin(schema.podcasts, eq(schema.purchases.podcastId, schema.podcasts.id))
      .where(and(eq(schema.purchases.userId, userId), eq(schema.purchases.status, 'completed')))
      .orderBy(desc(schema.purchases.createdAt));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
