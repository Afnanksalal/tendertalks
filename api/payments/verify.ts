import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${orderId}|${paymentId}`);
    const key = encoder.encode(RAZORPAY_KEY_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type,
      podcastId,
      planId,
      userId,
    } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 401,
        headers,
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment details' }), {
        status: 400,
        headers,
      });
    }

    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      if (type === 'purchase') {
        await db
          .update(schema.purchases)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(schema.purchases.razorpayOrderId, razorpay_order_id));
      }

      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
        status: 400,
        headers,
      });
    }

    if (type === 'purchase' && podcastId) {
      const [purchase] = await db
        .update(schema.purchases)
        .set({
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          updatedAt: new Date(),
        })
        .where(eq(schema.purchases.razorpayOrderId, razorpay_order_id))
        .returning();

      return new Response(JSON.stringify({ success: true, purchase }), {
        status: 200,
        headers,
      });
    } else if (type === 'subscription' && planId) {
      const [plan] = await db
        .select()
        .from(schema.pricingPlans)
        .where(eq(schema.pricingPlans.id, planId))
        .limit(1);

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), {
          status: 404,
          headers,
        });
      }

      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await db
        .update(schema.subscriptions)
        .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
        .where(
          and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active'))
        );

      const [subscription] = await db
        .insert(schema.subscriptions)
        .values({
          userId,
          planId,
          status: 'active',
          razorpayPaymentId: razorpay_payment_id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning();

      return new Response(JSON.stringify({ success: true, subscription }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request type' }), {
      status: 400,
      headers,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
