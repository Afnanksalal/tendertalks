import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

async function createRazorpayOrder(amount: number, receipt: string, notes: Record<string, string>) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Payment gateway not configured');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.description || 'Failed to create payment order');
  }

  return { order: await response.json(), keyId };
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const authUser = await verifyAuth(req);
    const { currency = 'INR', podcastId, planId, playlistId, type, userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), { status: 401, headers });
    }

    if (userId !== authUser.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: ID mismatch' }), {
        status: 403,
        headers,
      });
    }

    if (!type || !['purchase', 'subscription', 'playlist'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid payment type' }), {
        status: 400,
        headers,
      });
    }

    const db = getDb();
    let finalAmount = 0;
    let receipt = '';
    const metadata: Record<string, string> = { userId, type };

    if (type === 'purchase' && podcastId) {
      const existing = await db
        .select()
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.podcastId, podcastId),
            eq(schema.purchases.status, 'completed')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return new Response(JSON.stringify({ error: 'Already purchased' }), {
          status: 400,
          headers,
        });
      }

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

      if (podcast.isFree) {
        return new Response(JSON.stringify({ error: 'This content is free' }), {
          status: 400,
          headers,
        });
      }

      finalAmount = parseFloat(podcast.price || '0');
      receipt = `purchase_${podcastId.slice(0, 8)}_${Date.now()}`;
      metadata.podcastId = podcastId;
    } else if (type === 'subscription' && planId) {
      const [plan] = await db
        .select()
        .from(schema.pricingPlans)
        .where(eq(schema.pricingPlans.id, planId))
        .limit(1);

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });
      }

      finalAmount = parseFloat(plan.price);
      receipt = `sub_${planId.slice(0, 8)}_${Date.now()}`;
      metadata.planId = planId;
    } else if (type === 'playlist' && playlistId) {
      const [playlist] = await db
        .select()
        .from(schema.playlists)
        .where(eq(schema.playlists.id, playlistId))
        .limit(1);

      if (!playlist) {
        return new Response(JSON.stringify({ error: 'Playlist not found' }), {
          status: 404,
          headers,
        });
      }

      finalAmount = parseFloat(playlist.price || '0');
      receipt = `playlist_${playlistId.slice(0, 8)}_${Date.now()}`;
      metadata.playlistId = playlistId;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
    }

    if (finalAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400, headers });
    }

    const { order: razorpayOrder, keyId } = await createRazorpayOrder(
      finalAmount,
      receipt,
      metadata
    );

    if (type === 'purchase' && podcastId) {
      await db.insert(schema.purchases).values({
        userId,
        podcastId,
        amount: finalAmount.toString(),
        currency,
        status: 'pending',
        razorpayOrderId: razorpayOrder.id,
      });
    }

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: keyId,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
