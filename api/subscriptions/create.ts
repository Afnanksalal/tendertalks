import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const REFUND_WINDOW_DAYS = 7;

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
      'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
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
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const db = getDb();

    // Check if subscriptions feature is enabled
    const [subsSetting] = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, 'feature_subscriptions'))
      .limit(1);
    
    if (subsSetting && subsSetting.value === 'false') {
      return new Response(JSON.stringify({ error: 'Subscriptions are currently disabled' }), { status: 403, headers });
    }

    const { planId, currency = 'INR' } = await req.json();

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID required' }), { status: 400, headers });
    }

    const [plan] = await db.select().from(schema.pricingPlans)
      .where(and(eq(schema.pricingPlans.id, planId), eq(schema.pricingPlans.isActive, true)))
      .limit(1);

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });
    }

    const [existingSub] = await db.select().from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active')))
      .limit(1);

    if (existingSub) {
      return new Response(JSON.stringify({ 
        error: 'Active subscription exists. Use upgrade/downgrade instead.',
        currentPlanId: existingSub.planId 
      }), { status: 400, headers });
    }

    const amount = parseFloat(plan.price);
    
    // Free plan - activate immediately
    if (amount === 0) {
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const [subscription] = await db.insert(schema.subscriptions).values({
        userId,
        planId,
        status: 'active',
        amount: '0',
        currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      }).returning();

      return new Response(JSON.stringify({ success: true, subscription, isFree: true }), { status: 200, headers });
    }

    const { order: razorpayOrder, keyId } = await createRazorpayOrder(
      amount,
      `sub_new_${planId.slice(0, 8)}_${Date.now()}`,
      { userId, planId, type: 'subscription', action: 'new' }
    );

    return new Response(JSON.stringify({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: keyId,
      planId,
      planName: plan.name,
      refundWindowDays: REFUND_WINDOW_DAYS,
    }), { status: 200, headers });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
