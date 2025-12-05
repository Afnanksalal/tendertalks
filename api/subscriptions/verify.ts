import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${orderId}|${paymentId}`);
    const key = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expected = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return expected === signature;
  } catch {
    return false;
  }
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    let userId: string;
    try {
      const authUser = await verifyAuth(req);
      userId = authUser.id;
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      action = 'new',
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
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
    if (!isValid)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers });

    const db = getDb();
    const now = new Date();

    const [plan] = await db
      .select()
      .from(schema.pricingPlans)
      .where(eq(schema.pricingPlans.id, planId))
      .limit(1);
    if (!plan)
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });

    const periodEnd = new Date(now);
    plan.interval === 'year'
      ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      : periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (action === 'new' || action === 'upgrade') {
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
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount: plan.price,
          currency: plan.currency,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning();

      return new Response(
        JSON.stringify({
          success: true,
          subscription: { ...subscription, plan },
          message: action === 'upgrade' ? 'Upgraded successfully!' : 'Subscription activated!',
        }),
        { status: 200, headers }
      );
    } else if (action === 'downgrade') {
      const [currentSub] = await db
        .select()
        .from(schema.subscriptions)
        .where(
          and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active'))
        )
        .limit(1);

      if (currentSub) {
        await db
          .update(schema.subscriptions)
          .set({ pendingPlanId: planId, updatedAt: now })
          .where(eq(schema.subscriptions.id, currentSub.id));

        return new Response(
          JSON.stringify({
            success: true,
            message: `Downgrade scheduled for ${new Date(currentSub.currentPeriodEnd).toLocaleDateString()}.`,
          }),
          { status: 200, headers }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
