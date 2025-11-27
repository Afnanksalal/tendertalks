import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const REFUND_WINDOW_DAYS = 7;

// Lazy initialization to avoid errors at module load time
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const sql_client = neon(process.env.DATABASE_URL);
  return drizzle(sql_client, { schema });
}

function getRazorpayCredentials() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  };
}

// Edge-compatible base64 encoding
function base64Encode(str: string): string {
  return btoa(str);
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
    const { planId, currency = 'INR' } = body;

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID required' }), { status: 400, headers });
    }

    // Get credentials
    const { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET } = getRazorpayCredentials();

    // Validate Razorpay credentials
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500, headers });
    }

    // Get database connection
    let db;
    try {
      db = getDb();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return new Response(JSON.stringify({ error: 'Database connection failed' }), { status: 500, headers });
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

      // Record in payment history (table may not exist yet)
      try {
        await db.insert(schema.paymentHistory).values({
          userId,
          type: 'subscription',
          amount: '0',
          currency,
          status: 'completed',
          refId: subscription.id,
          refType: 'subscription',
          metadata: JSON.stringify({ planId, action: 'new', planName: plan.name, isFree: true }),
        });
      } catch (e) {
        console.warn('Payment history insert failed:', e);
      }

      return new Response(JSON.stringify({ success: true, subscription, isFree: true }), { status: 200, headers });
    }

    // Create Razorpay order using form-urlencoded format
    const receipt = `sub_new_${planId.slice(0, 8)}_${Date.now()}`;
    const formData = new URLSearchParams();
    formData.append('amount', String(Math.round(amount * 100)));
    formData.append('currency', currency);
    formData.append('receipt', receipt);
    formData.append('notes[userId]', userId);
    formData.append('notes[planId]', planId);
    formData.append('notes[type]', 'subscription');
    formData.append('notes[action]', 'new');

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: formData.toString(),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('Razorpay order creation failed:', razorpayResponse.status, errorText);
      
      let errorMessage = 'Failed to create payment order';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.description || errorJson.error?.reason || errorMessage;
      } catch {}
      
      if (razorpayResponse.status === 401) {
        errorMessage = 'Invalid payment gateway credentials';
      } else if (razorpayResponse.status === 406) {
        errorMessage = 'Payment request format error';
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers });
    }

    const razorpayOrder = await razorpayResponse.json();

    // Record in payment history (table may not exist yet - run migration)
    try {
      await db.insert(schema.paymentHistory).values({
        userId,
        type: 'subscription',
        amount: amount.toString(),
        currency,
        status: 'pending',
        razorpayOrderId: razorpayOrder.id,
        metadata: JSON.stringify({ planId, action: 'new', planName: plan.name }),
      });
    } catch (historyError) {
      console.warn('Payment history insert failed (run migration):', historyError);
    }

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
