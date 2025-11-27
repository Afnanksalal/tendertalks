import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// Lazy initialization
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const sql_client = neon(process.env.DATABASE_URL);
  return drizzle(sql_client, { schema });
}

function getRazorpaySecret() {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET environment variable is not set');
  }
  return secret;
}

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  try {
    const RAZORPAY_KEY_SECRET = getRazorpaySecret();
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

// Helper to safely update payment history (table may not exist yet)
async function safeUpdatePaymentHistory(db: ReturnType<typeof getDb>, orderId: string, data: any) {
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
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, action = 'new' } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
      return new Response(JSON.stringify({ error: 'Missing payment details' }), { status: 400, headers });
    }

    const db = getDb();
    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    const now = new Date();

    if (!isValid) {
      await safeUpdatePaymentHistory(db, razorpay_order_id, { status: 'failed', updatedAt: now });
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), { status: 400, headers });
    }

    // Get plan details
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

    // Update payment history as completed
    await safeUpdatePaymentHistory(db, razorpay_order_id, {
      status: 'completed',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      updatedAt: now,
    });

    if (action === 'new' || action === 'upgrade') {
      // Cancel any existing active subscription
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

      await safeUpdatePaymentHistory(db, razorpay_order_id, { refId: subscription.id, refType: 'subscription' });

      const message = action === 'upgrade' 
        ? 'Upgraded successfully! New plan is now active.'
        : 'Subscription activated successfully!';

      return new Response(JSON.stringify({
        success: true,
        subscription: { ...subscription, plan },
        message,
      }), { status: 200, headers });

    } else if (action === 'downgrade') {
      const [currentSub] = await db.select().from(schema.subscriptions)
        .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active')))
        .limit(1);

      if (currentSub) {
        await db.update(schema.subscriptions)
          .set({ pendingPlanId: planId, updatedAt: now })
          .where(eq(schema.subscriptions.id, currentSub.id));

        return new Response(JSON.stringify({
          success: true,
          message: `Downgrade scheduled. New plan will activate on ${currentSub.currentPeriodEnd.toLocaleDateString()}.`,
          effectiveDate: currentSub.currentPeriodEnd,
        }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });

  } catch (error) {
    console.error('Error verifying subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
