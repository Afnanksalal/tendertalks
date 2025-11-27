import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Helper to extract storage path from URL
function extractStoragePath(url: string | null, bucket: string): string | null {
  if (!url) return null;
  
  // Handle supabase:// format
  if (url.startsWith('supabase://')) {
    const parts = url.replace('supabase://', '').split('/');
    parts.shift(); // Remove bucket name
    return parts.join('/');
  }
  
  // Handle public URL format
  const bucketPattern = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(bucketPattern);
  if (idx !== -1) {
    return url.substring(idx + bucketPattern.length);
  }
  
  return null;
}

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
      // First, get the podcast to retrieve file URLs
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

      // Delete associated files from Supabase storage
      const deletePromises: Promise<any>[] = [];

      // Delete thumbnail
      if (podcast.thumbnailUrl) {
        const thumbnailPath = extractStoragePath(podcast.thumbnailUrl, 'thumbnails');
        if (thumbnailPath) {
          deletePromises.push(
            supabase.storage.from('thumbnails').remove([thumbnailPath])
              .then(({ error }) => {
                if (error) console.error('Error deleting thumbnail:', error);
              })
          );
        }
      }

      // Delete media file
      if (podcast.mediaUrl) {
        const mediaPath = extractStoragePath(podcast.mediaUrl, 'podcasts');
        if (mediaPath) {
          deletePromises.push(
            supabase.storage.from('podcasts').remove([mediaPath])
              .then(({ error }) => {
                if (error) console.error('Error deleting media:', error);
              })
          );
        }
      }

      // Wait for storage deletions (don't fail if storage delete fails)
      await Promise.allSettled(deletePromises);

      // Delete related records first (purchases, play history, downloads, tags)
      await db.delete(schema.playHistory).where(eq(schema.playHistory.podcastId, podcastId));
      await db.delete(schema.downloads).where(eq(schema.downloads.podcastId, podcastId));
      await db.delete(schema.podcastTags).where(eq(schema.podcastTags.podcastId, podcastId));
      await db.delete(schema.purchases).where(eq(schema.purchases.podcastId, podcastId));

      // Delete the podcast from database
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
