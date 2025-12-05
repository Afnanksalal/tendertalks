import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq } from 'drizzle-orm';

import { verifyAuth } from '../utils/auth';

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

  try {
    const authUser = await verifyAuth(req);
    const userId = authUser.id;

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers,
      });
    }

    const { title, description, price, coverUrl, podcastIds } = await req.json();

    if (!title || !price) {
      return new Response(JSON.stringify({ error: 'Title and price are required' }), {
        status: 400,
        headers,
      });
    }

    // Create playlist
    const [playlist] = await db
      .insert(schema.playlists)
      .values({
        title,
        slug: title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        description,
        price: price.toString(),
        coverUrl,
        createdBy: userId,
      })
      .returning();

    // Add podcasts to playlist
    if (podcastIds && Array.isArray(podcastIds) && podcastIds.length > 0) {
      await db.insert(schema.playlistPodcasts).values(
        podcastIds.map((podcastId: string, index: number) => ({
          playlistId: playlist.id,
          podcastId,
          order: index,
        }))
      );
    }

    return new Response(JSON.stringify(playlist), { status: 201, headers });
  } catch (error) {
    console.error('Error creating playlist:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
