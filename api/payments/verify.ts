import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${orderId}|${paymentId}`);
    const key = encoder.encode(RAZORPAY_KEY_SECRET);

    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0')).join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Helper to safely update payment history
async function updatePaymentHistory(orderId: string, data: any) {
  try {
    await db.update(schema.paymentHistory).set(data).where(eq(schema.paymentHistory.razorpayOrderId, orderId));
  } catch (e) {
    console.warn('Payment history update failed (run migration):', e);
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type, podcastId, planId, userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), { status: 401, headers });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment details' }), { status: 400, headers });
    }

    // Idempotency check - prevent double processing
    if (type === 'purchase') {
      const [existingPurchase] = await db.select().from(schema.purchases)
        .where(eq(schema.purchases.razorpayOrderId, razorpay_order_id))
        .limit(1);
      
      if (existingPurchase && existingPurchase.status === 'completed') {
        return new Response(JSON.stringify({ 
          success: true, 
          purchase: existingPurchase,
          message: 'Payment already processed'
        }), { status: 200, headers });
      }
    }

    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    const now = new Date();

    if (!isValid) {
      await updatePaymentHistory(razorpay_order_id, { status: 'failed', updatedAt: now });

      if (type === 'purchase') {
        await db.update(schema.purchases)
          .set({ status: 'failed', updatedAt: now })
          .where(eq(schema.purchases.razorpayOrderId, razorpay_order_id));
      }

      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), { status: 400, headers });
    }

    // Update payment history as completed
    await updatePaymentHistory(razorpay_order_id, {
      status: 'completed',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      updatedAt: now,
    });

    if (type === 'purchase' && podcastId) {
      const [purchase] = await db.update(schema.purchases)
        .set({
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          updatedAt: now,
        })
        .where(eq(schema.purchases.razorpayOrderId, razorpay_order_id))
        .returning();

      if (purchase) {
        await updatePaymentHistory(razorpay_order_id, { refId: purchase.id, refType: 'purchase' });
      }

      return new Response(JSON.stringify({ success: true, purchase }), { status: 200, headers });

    } else if (type === 'subscription' && planId) {
      const [plan] = await db.select().from(schema.pricingPlans)
        .where(eq(schema.pricingPlans.id, planId)).limit(1);

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });
      }

      const periodEnd = new Date(now);
      if (plan.interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Cancel existing active subscription
      await db.update(schema.subscriptions)
        .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
        .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active')));

      // Create new subscription
      const [subscription] = await db.insert(schema.subscriptions).values({
        userId,
        planId,
        status: 'active',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: plan.price,
        currency: plan.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      }).returning();

      await updatePaymentHistory(razorpay_order_id, { refId: subscription.id, refType: 'subscription' });

      return new Response(JSON.stringify({ success: true, subscription }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Invalid request type' }), { status: 400, headers });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
