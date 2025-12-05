import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, asc } from 'drizzle-orm';

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
    const id = url.pathname.split('/').pop();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Playlist ID required' }), {
        status: 400,
        headers,
      });
    }

    const [playlist] = await db
      .select({
        playlist: schema.playlists,
        creator: {
          id: schema.users.id,
          name: schema.users.name,
          avatarUrl: schema.users.avatarUrl,
        },
      })
      .from(schema.playlists)
      .leftJoin(schema.users, eq(schema.playlists.createdBy, schema.users.id))
      .where(eq(schema.playlists.id, id));

    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), {
        status: 404,
        headers,
      });
    }

    // Get podcasts in playlist
    const podcasts = await db
      .select({
        podcast: schema.podcasts,
        order: schema.playlistPodcasts.order,
      })
      .from(schema.playlistPodcasts)
      .leftJoin(schema.podcasts, eq(schema.playlistPodcasts.podcastId, schema.podcasts.id))
      .where(eq(schema.playlistPodcasts.playlistId, id))
      .orderBy(asc(schema.playlistPodcasts.order));

    return new Response(
      JSON.stringify({
        ...playlist.playlist,
        creator: playlist.creator,
        podcasts: podcasts.map((p) => ({ ...p.podcast, order: p.order })),
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
