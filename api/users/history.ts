import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, desc } from 'drizzle-orm';

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

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
    const result = await db
      .select({
        id: schema.playHistory.id,
        progress: schema.playHistory.progress,
        completed: schema.playHistory.completed,
        lastPlayedAt: schema.playHistory.lastPlayedAt,
        podcast: {
          id: schema.podcasts.id,
          title: schema.podcasts.title,
          slug: schema.podcasts.slug,
          thumbnailUrl: schema.podcasts.thumbnailUrl,
          duration: schema.podcasts.duration,
          mediaType: schema.podcasts.mediaType,
        },
      })
      .from(schema.playHistory)
      .innerJoin(schema.podcasts, eq(schema.playHistory.podcastId, schema.podcasts.id))
      .where(eq(schema.playHistory.userId, userId))
      .orderBy(desc(schema.playHistory.lastPlayedAt))
      .limit(50);

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching play history:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = {
  runtime: 'edge',
};
