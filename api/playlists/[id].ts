import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, asc } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

import { verifyAuth } from '../utils/auth';

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return new Response(JSON.stringify({ error: 'Playlist ID required' }), {
      status: 400,
      headers,
    });
  }

  try {
    if (req.method === 'GET') {
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
    }

    // Auth check for PATCH and DELETE
    let userId: string;
    try {
      const authUser = await verifyAuth(req);
      userId = authUser.id;
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

    if (!user || user.role !== 'admin') {
      // Ideally check ownership too, but for now Admin only is consistent with other admin tools
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers,
      });
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const { title, description, price, coverUrl, podcastIds } = body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (price) updateData.price = price.toString();
      if (coverUrl) updateData.coverUrl = coverUrl;

      const [updatedPlaylist] = await db
        .update(schema.playlists)
        .set(updateData)
        .where(eq(schema.playlists.id, id))
        .returning();

      if (podcastIds && Array.isArray(podcastIds)) {
        // Delete existing associations
        await db.delete(schema.playlistPodcasts).where(eq(schema.playlistPodcasts.playlistId, id));

        // Insert new ones
        if (podcastIds.length > 0) {
          await db.insert(schema.playlistPodcasts).values(
            podcastIds.map((podcastId: string, index: number) => ({
              playlistId: id,
              podcastId,
              order: index,
            }))
          );
        }
      }

      return new Response(JSON.stringify(updatedPlaylist), { status: 200, headers });
    }

    if (req.method === 'DELETE') {
      // Delete associations first
      await db.delete(schema.playlistPodcasts).where(eq(schema.playlistPodcasts.playlistId, id));
      // Delete playlist
      await db.delete(schema.playlists).where(eq(schema.playlists.id, id));

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  } catch (error) {
    console.error('Error handling playlist request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
