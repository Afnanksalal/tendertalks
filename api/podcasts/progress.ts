import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  let userId: string;
  try {
    const authUser = await verifyAuth(req);
    userId = authUser.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { podcastId, progress, completed } = body;

    if (!podcastId) {
      return new Response(JSON.stringify({ error: 'Podcast ID required' }), {
        status: 400,
        headers,
      });
    }

    const [existing] = await db
      .select()
      .from(schema.playHistory)
      .where(
        and(eq(schema.playHistory.userId, userId), eq(schema.playHistory.podcastId, podcastId))
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(schema.playHistory)
        .set({
          progress: progress ?? existing.progress,
          completed: completed ?? existing.completed,
          lastPlayedAt: new Date(),
        })
        .where(eq(schema.playHistory.id, existing.id))
        .returning();

      return new Response(JSON.stringify(updated), { status: 200, headers });
    }

    const [created] = await db
      .insert(schema.playHistory)
      .values({
        userId,
        podcastId,
        progress: progress ?? 0,
        completed: completed ?? false,
      })
      .returning();

    return new Response(JSON.stringify(created), { status: 201, headers });
  } catch (error) {
    console.error('Error updating play progress:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = {
  runtime: 'edge',
};
