import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { playHistory, podcasts } from '../../src/db/schema';
import { eq, desc } from 'drizzle-orm';

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
        id: playHistory.id,
        progress: playHistory.progress,
        completed: playHistory.completed,
        lastPlayedAt: playHistory.lastPlayedAt,
        podcast: {
          id: podcasts.id,
          title: podcasts.title,
          slug: podcasts.slug,
          thumbnailUrl: podcasts.thumbnailUrl,
          duration: podcasts.duration,
          mediaType: podcasts.mediaType,
        },
      })
      .from(playHistory)
      .innerJoin(podcasts, eq(playHistory.podcastId, podcasts.id))
      .where(eq(playHistory.userId, userId))
      .orderBy(desc(playHistory.lastPlayedAt))
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
