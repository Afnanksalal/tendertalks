import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

// Create Supabase client for storage access
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to get signed URL for private media
async function getMediaUrl(mediaUrl: string | null): Promise<string | null> {
  if (!mediaUrl) return null;

  // Handle supabase://bucket/path format
  if (mediaUrl.startsWith('supabase://')) {
    const match = mediaUrl.match(/^supabase:\/\/([^/]+)\/(.+)$/);
    if (match) {
      const [, bucket, path] = match;
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 7200); // 2 hours
      if (data && !error) return data.signedUrl;
    }
  }

  // Handle existing public URLs from podcasts bucket - convert to signed
  if (mediaUrl.includes('supabase.co/storage') && mediaUrl.includes('/podcasts/')) {
    const urlMatch = mediaUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (urlMatch) {
      const [, bucket, path] = urlMatch;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(decodeURIComponent(path), 7200);
      if (data && !error) return data.signedUrl;
    }
  }

  return mediaUrl;
}

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
    const pathParts = url.pathname.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 1];

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug required' }), {
        status: 400,
        headers,
      });
    }

    const result = await db
      .select({
        podcast: schema.podcasts,
        category: schema.categories,
        creator: {
          id: schema.users.id,
          name: schema.users.name,
          avatarUrl: schema.users.avatarUrl,
        },
      })
      .from(schema.podcasts)
      .leftJoin(schema.categories, eq(schema.podcasts.categoryId, schema.categories.id))
      .leftJoin(schema.users, eq(schema.podcasts.createdBy, schema.users.id))
      .where(eq(schema.podcasts.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Podcast not found' }), {
        status: 404,
        headers,
      });
    }

    const podcastTagsResult = await db
      .select({ tag: schema.tags })
      .from(schema.podcastTags)
      .innerJoin(schema.tags, eq(schema.podcastTags.tagId, schema.tags.id))
      .where(eq(schema.podcastTags.podcastId, result[0].podcast.id));

    // Check if user has access to get the media URL
    let userId: string | null = null;
    try {
      const user = await verifyAuth(req);
      userId = user.id;
    } catch {
      // User not authenticated, continue as guest
    }

    let mediaUrl: string | null = null;
    const podcastData = result[0].podcast;

    // Determine if user has access
    let hasAccess = podcastData.isFree;

    if (!hasAccess && userId) {
      // Check subscription
      const [subscription] = await db
        .select()
        .from(schema.subscriptions)
        .where(
          and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active'))
        )
        .limit(1);

      if (subscription) {
        hasAccess = true;
      } else {
        // Check purchase
        const [purchase] = await db
          .select()
          .from(schema.purchases)
          .where(
            and(
              eq(schema.purchases.userId, userId),
              eq(schema.purchases.podcastId, podcastData.id),
              eq(schema.purchases.status, 'completed')
            )
          )
          .limit(1);

        if (purchase) {
          hasAccess = true;
        }
      }
    }

    // Only provide media URL if user has access
    if (hasAccess && podcastData.mediaUrl) {
      mediaUrl = await getMediaUrl(podcastData.mediaUrl);
    }

    const podcast = {
      ...podcastData,
      mediaUrl, // Will be null if no access, signed URL if has access
      category: result[0].category,
      creator: result[0].creator,
      tags: podcastTagsResult.map((t) => t.tag),
    };

    // Increment view count (fire and forget)
    db.update(schema.podcasts)
      .set({ viewCount: (result[0].podcast.viewCount || 0) + 1 })
      .where(eq(schema.podcasts.id, result[0].podcast.id))
      .catch(console.error);

    return new Response(JSON.stringify(podcast), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
