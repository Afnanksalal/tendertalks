import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

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

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const podcastId = pathParts[pathParts.length - 1];

  if (!podcastId) {
    return new Response(JSON.stringify({ error: 'Podcast ID required' }), {
      status: 400,
      headers,
    });
  }

  if (req.method === 'GET') {
    try {
      const [podcast] = await db
        .select()
        .from(schema.podcasts)
        .where(eq(schema.podcasts.id, podcastId))
        .limit(1);

      if (!podcast) {
        return new Response(JSON.stringify({ error: 'Podcast not found' }), {
          status: 404,
          headers,
        });
      }

      return new Response(JSON.stringify(podcast), { status: 200, headers });
    } catch (error) {
      console.error('Error fetching podcast:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = await req.json();
      const {
        title,
        description,
        thumbnailUrl,
        mediaUrl,
        mediaType,
        duration,
        isFree,
        price,
        isDownloadable,
        categoryId,
        status,
      } = body;

      const updateData: Record<string, any> = { updatedAt: new Date() };
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
      if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
      if (mediaType !== undefined) updateData.mediaType = mediaType;
      if (duration !== undefined) updateData.duration = duration;
      if (isFree !== undefined) updateData.isFree = isFree;
      if (price !== undefined) updateData.price = price;
      if (isDownloadable !== undefined) updateData.isDownloadable = isDownloadable;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (status !== undefined) updateData.status = status;

      const [updated] = await db
        .update(schema.podcasts)
        .set(updateData)
        .where(eq(schema.podcasts.id, podcastId))
        .returning();

      return new Response(JSON.stringify(updated), { status: 200, headers });
    } catch (error) {
      console.error('Error updating podcast:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await db.delete(schema.podcasts).where(eq(schema.podcasts.id, podcastId));

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (error) {
      console.error('Error deleting podcast:', error);
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
