import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { podcasts, downloads, subscriptions, purchases, pricingPlans } from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const podcastId = pathParts[pathParts.length - 2];

    if (!podcastId) {
      return new Response(JSON.stringify({ error: 'Podcast ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get podcast
    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.id, podcastId))
      .limit(1);

    if (!podcast) {
      return new Response(JSON.stringify({ error: 'Podcast not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user has access
    let hasAccess = podcast.isFree;

    if (!hasAccess) {
      // Check subscription with download permission
      const [subscription] = await db
        .select({
          subscription: subscriptions,
          plan: pricingPlans,
        })
        .from(subscriptions)
        .innerJoin(pricingPlans, eq(subscriptions.planId, pricingPlans.id))
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
        .limit(1);

      if (subscription && subscription.plan.allowDownloads) {
        hasAccess = true;
      }

      // Check purchase
      if (!hasAccess) {
        const [purchase] = await db
          .select()
          .from(purchases)
          .where(
            and(
              eq(purchases.userId, userId),
              eq(purchases.podcastId, podcastId),
              eq(purchases.status, 'completed')
            )
          )
          .limit(1);

        if (purchase) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied. Purchase or subscribe to download.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!podcast.mediaUrl) {
      return new Response(JSON.stringify({ error: 'No media file available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Record download
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry

    await db.insert(downloads).values({
      userId,
      podcastId,
      expiresAt,
    });

    return new Response(
      JSON.stringify({
        url: podcast.mediaUrl,
        expiresAt: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing download:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  runtime: 'edge',
};
