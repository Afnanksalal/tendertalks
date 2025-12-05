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

  let userId: string;
  try {
    const user = await verifyAuth(req);
    userId = user.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    // Check if downloads feature is enabled
    const [downloadsSetting] = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, 'feature_downloads'))
      .limit(1);

    if (downloadsSetting && downloadsSetting.value === 'false') {
      return new Response(JSON.stringify({ error: 'Downloads are currently disabled' }), {
        status: 403,
        headers,
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 2];

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Podcast slug required' }), {
        status: 400,
        headers,
      });
    }

    const [podcast] = await db
      .select()
      .from(schema.podcasts)
      .where(eq(schema.podcasts.slug, slug))
      .limit(1);

    if (!podcast) {
      return new Response(JSON.stringify({ error: 'Podcast not found' }), {
        status: 404,
        headers,
      });
    }

    // Check subscription for download permissions
    const [subscription] = await db
      .select({
        subscription: schema.subscriptions,
        plan: schema.pricingPlans,
      })
      .from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(
        and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active'))
      )
      .limit(1);

    const planAllowsDownloads = subscription?.plan?.allowDownloads || false;

    // Check if user has purchased this podcast
    const [purchase] = await db
      .select()
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.userId, userId),
          eq(schema.purchases.podcastId, podcast.id),
          eq(schema.purchases.status, 'completed')
        )
      )
      .limit(1);

    const hasPurchased = !!purchase;
    const hasContentAccess = podcast.isFree || hasPurchased || !!subscription;

    // Determine if download is allowed:
    // 1. Plan allows downloads AND user has content access
    // 2. OR podcast is explicitly marked as downloadable AND user has content access
    const canDownload = hasContentAccess && (planAllowsDownloads || podcast.isDownloadable);

    if (!canDownload) {
      if (!hasContentAccess) {
        return new Response(
          JSON.stringify({ error: 'Access denied. Purchase or subscribe to access this content.' }),
          {
            status: 403,
            headers,
          }
        );
      }
      return new Response(
        JSON.stringify({
          error:
            'Downloads not available for this content. Upgrade your plan for unlimited downloads.',
        }),
        {
          status: 403,
          headers,
        }
      );
    }

    if (!podcast.mediaUrl) {
      return new Response(JSON.stringify({ error: 'No media file available' }), {
        status: 404,
        headers,
      });
    }

    let downloadUrl = podcast.mediaUrl;

    // If it's a Supabase storage URL, generate a signed URL
    if (podcast.mediaUrl.startsWith('supabase://')) {
      // Parse supabase://bucket/path format
      const match = podcast.mediaUrl.match(/^supabase:\/\/([^/]+)\/(.+)$/);
      if (match) {
        const [, bucket, path] = match;
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 7200); // 2 hours expiry

        if (error || !data) {
          console.error('Failed to create signed URL:', error);
          return new Response(JSON.stringify({ error: 'Failed to generate download URL' }), {
            status: 500,
            headers,
          });
        }
        downloadUrl = data.signedUrl;
      }
    } else if (podcast.mediaUrl.includes('supabase.co/storage')) {
      // Handle existing public URLs - extract path and create signed URL
      const urlMatch = podcast.mediaUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (urlMatch) {
        const [, bucket, path] = urlMatch;
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(decodeURIComponent(path), 7200);

        if (data && !error) {
          downloadUrl = data.signedUrl;
        }
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(schema.downloads).values({
      userId,
      podcastId: podcast.id,
      expiresAt,
    });

    return new Response(
      JSON.stringify({
        url: downloadUrl,
        expiresAt: expiresAt.toISOString(),
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error processing download:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
