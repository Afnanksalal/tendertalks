import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(req.url);

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

  if (req.method === 'GET') {
    try {
      const result = await db
        .select({
          id: schema.downloads.id,
          downloadedAt: schema.downloads.downloadedAt,
          expiresAt: schema.downloads.expiresAt,
          podcast: {
            id: schema.podcasts.id,
            title: schema.podcasts.title,
            slug: schema.podcasts.slug,
            thumbnailUrl: schema.podcasts.thumbnailUrl,
            duration: schema.podcasts.duration,
            mediaType: schema.podcasts.mediaType,
          },
        })
        .from(schema.downloads)
        .innerJoin(schema.podcasts, eq(schema.downloads.podcastId, schema.podcasts.id))
        .where(eq(schema.downloads.userId, userId))
        .orderBy(desc(schema.downloads.downloadedAt));

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      console.error('Error fetching downloads:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const pathParts = url.pathname.split('/');
      const downloadId = pathParts[pathParts.length - 1];

      if (!downloadId || downloadId === 'downloads') {
        return new Response(JSON.stringify({ error: 'Download ID required' }), {
          status: 400,
          headers,
        });
      }

      await db
        .delete(schema.downloads)
        .where(and(eq(schema.downloads.id, downloadId), eq(schema.downloads.userId, userId)));

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (error) {
      console.error('Error deleting download:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers,
  });
}

export const config = {
  runtime: 'edge',
};
