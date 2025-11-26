import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { downloads, podcasts } from '../../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(req.url);
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  if (req.method === 'GET') {
    try {
      const result = await db
        .select({
          id: downloads.id,
          downloadedAt: downloads.downloadedAt,
          expiresAt: downloads.expiresAt,
          podcast: {
            id: podcasts.id,
            title: podcasts.title,
            slug: podcasts.slug,
            thumbnailUrl: podcasts.thumbnailUrl,
            duration: podcasts.duration,
            mediaType: podcasts.mediaType,
          },
        })
        .from(downloads)
        .innerJoin(podcasts, eq(downloads.podcastId, podcasts.id))
        .where(eq(downloads.userId, userId))
        .orderBy(desc(downloads.downloadedAt));

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
      // Extract download ID from path: /api/users/downloads/:id
      const pathParts = url.pathname.split('/');
      const downloadId = pathParts[pathParts.length - 1];
      
      // If the last part is 'downloads', there's no ID
      if (!downloadId || downloadId === 'downloads') {
        return new Response(JSON.stringify({ error: 'Download ID required' }), {
          status: 400,
          headers,
        });
      }

      // Only delete if it belongs to the user
      await db
        .delete(downloads)
        .where(and(eq(downloads.id, downloadId), eq(downloads.userId, userId)));

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
