import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

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

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
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

    let hasAccess = podcast.isFree;

    if (!hasAccess) {
      const [subscription] = await db
        .select({
          subscription: schema.subscriptions,
          plan: schema.pricingPlans,
        })
        .from(schema.subscriptions)
        .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
        .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active')))
        .limit(1);

      if (subscription && subscription.plan.allowDownloads) {
        hasAccess = true;
      }

      if (!hasAccess) {
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

        if (purchase) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied. Purchase or subscribe to download.' }), {
        status: 403,
        headers,
      });
    }

    if (!podcast.mediaUrl) {
      return new Response(JSON.stringify({ error: 'No media file available' }), {
        status: 404,
        headers,
      });
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
        url: podcast.mediaUrl,
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
