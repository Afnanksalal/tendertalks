import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

// Refund window in days (7 days)
const REFUND_WINDOW_DAYS = 7;

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
    const { planId, currency = 'INR' } = body;

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID required' }), { status: 400, headers });
    }

    // Get the plan
    const [plan] = await db.select().from(schema.pricingPlans)
      .where(and(eq(schema.pricingPlans.id, planId), eq(schema.pricingPlans.isActive, true)))
      .limit(1);

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found or inactive' }), { status: 404, headers });
    }

    // Check for existing active subscription
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

    // Create Razorpay order
    const receipt = `sub_new_${planId.slice(0, 8)}_${Date.now()}`;
    const orderData = {
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes: {
        userId,
        planId,
        type: 'subscription',
        action: 'new',
      },
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const error = await razorpayResponse.text();
      console.error('Razorpay error:', error);
      throw new Error('Failed to create payment order');
    }

    const razorpayOrder = await razorpayResponse.json();

    // Record in payment history
    await db.insert(schema.paymentHistory).values({
      userId,
      type: 'subscription',
      amount: amount.toString(),
      currency,
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
      metadata: JSON.stringify({ planId, action: 'new', planName: plan.name }),
    });

    return new Response(JSON.stringify({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: RAZORPAY_KEY_ID,
      planId,
      planName: plan.name,
      refundWindowDays: REFUND_WINDOW_DAYS,
    }), { status: 200, headers });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
