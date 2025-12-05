import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const conditions = [];

    if (search) {
      conditions.push(
        sql`(${schema.playlists.title} ILIKE ${`%${search}%`} OR ${schema.playlists.description} ILIKE ${`%${search}%`})`
      );
    }

    const result = await db
      .select({
        playlist: schema.playlists,
        creator: {
          id: schema.users.id,
          name: schema.users.name,
          avatarUrl: schema.users.avatarUrl,
        },
        podcastCount: sql<number>`count(${schema.playlistPodcasts.id})`,
      })
      .from(schema.playlists)
      .leftJoin(schema.users, eq(schema.playlists.createdBy, schema.users.id))
      .leftJoin(
        schema.playlistPodcasts,
        eq(schema.playlists.id, schema.playlistPodcasts.playlistId)
      )
      .where(and(...conditions))
      .groupBy(schema.playlists.id, schema.users.id)
      .orderBy(desc(schema.playlists.createdAt))
      .limit(limit)
      .offset(offset);

    const data = result.map((r) => ({
      ...r.playlist,
      creator: r.creator,
      podcastCount: Number(r.podcastCount),
    }));

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
