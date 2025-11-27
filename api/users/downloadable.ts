import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

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

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
    // Check if user has a subscription with download permissions
    const [subscription] = await db
      .select({
        subscription: schema.subscriptions,
        plan: schema.pricingPlans,
      })
      .from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          or(
            eq(schema.subscriptions.status, 'active'),
            eq(schema.subscriptions.status, 'pending_downgrade')
          )
        )
      )
      .limit(1);

    const planAllowsDownloads = subscription?.plan?.allowDownloads || false;

    // Get user's purchased podcasts
    const purchasedPodcasts = await db
      .select({
        podcastId: schema.purchases.podcastId,
      })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.userId, userId),
          eq(schema.purchases.status, 'completed')
        )
      );

    const purchasedIds = purchasedPodcasts.map(p => p.podcastId);

    // Get downloadable content:
    // 1. If plan allows downloads: all purchased + all free downloadable podcasts
    // 2. If no plan: only podcasts marked as isDownloadable that user has access to
    
    let downloadableContent;

    if (planAllowsDownloads) {
      // User with download-enabled plan: get all content they have access to
      downloadableContent = await db
        .select({
          id: schema.podcasts.id,
          title: schema.podcasts.title,
          slug: schema.podcasts.slug,
          thumbnailUrl: schema.podcasts.thumbnailUrl,
          duration: schema.podcasts.duration,
          mediaType: schema.podcasts.mediaType,
          isDownloadable: schema.podcasts.isDownloadable,
          isFree: schema.podcasts.isFree,
        })
        .from(schema.podcasts)
        .where(
          and(
            eq(schema.podcasts.status, 'published'),
            sql`${schema.podcasts.mediaUrl} IS NOT NULL`,
            or(
              eq(schema.podcasts.isFree, true),
              purchasedIds.length > 0 
                ? sql`${schema.podcasts.id} IN (${sql.join(purchasedIds.map(id => sql`${id}`), sql`, `)})`
                : sql`FALSE`
            )
          )
        )
        .orderBy(desc(schema.podcasts.publishedAt));
    } else {
      // Free user: only get podcasts that are explicitly marked as downloadable
      downloadableContent = await db
        .select({
          id: schema.podcasts.id,
          title: schema.podcasts.title,
          slug: schema.podcasts.slug,
          thumbnailUrl: schema.podcasts.thumbnailUrl,
          duration: schema.podcasts.duration,
          mediaType: schema.podcasts.mediaType,
          isDownloadable: schema.podcasts.isDownloadable,
          isFree: schema.podcasts.isFree,
        })
        .from(schema.podcasts)
        .where(
          and(
            eq(schema.podcasts.status, 'published'),
            eq(schema.podcasts.isDownloadable, true),
            sql`${schema.podcasts.mediaUrl} IS NOT NULL`,
            or(
              eq(schema.podcasts.isFree, true),
              purchasedIds.length > 0 
                ? sql`${schema.podcasts.id} IN (${sql.join(purchasedIds.map(id => sql`${id}`), sql`, `)})`
                : sql`FALSE`
            )
          )
        )
        .orderBy(desc(schema.podcasts.publishedAt));
    }

    return new Response(JSON.stringify(downloadableContent), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching downloadable content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
