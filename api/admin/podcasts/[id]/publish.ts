import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
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

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const podcastId = pathParts[pathParts.length - 2];

    if (!podcastId) {
      return new Response(JSON.stringify({ error: 'Podcast ID required' }), {
        status: 400,
        headers,
      });
    }

    const [podcast] = await db
      .update(schema.podcasts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.podcasts.id, podcastId))
      .returning();

    if (!podcast) {
      return new Response(JSON.stringify({ error: 'Podcast not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(podcast), { status: 200, headers });
  } catch (error) {
    console.error('Error publishing podcast:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = {
  runtime: 'edge',
};
