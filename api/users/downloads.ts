import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { downloads, podcasts } from '../../src/db/schema';
import { eq, desc } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
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

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching downloads:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const downloadId = url.pathname.split('/').pop();
      
      if (!downloadId) {
        return new Response(JSON.stringify({ error: 'Download ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await db.delete(downloads).where(eq(downloads.id, downloadId));

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error deleting download:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = {
  runtime: 'edge',
};
