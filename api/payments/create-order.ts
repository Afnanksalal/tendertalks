import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

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
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
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
    const { amount, currency = 'INR', podcastId, planId, type, userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), { status: 401, headers });
    }

    if (!type || !['purchase', 'subscription'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid payment type' }), { status: 400, headers });
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

    let finalAmount = amount;
    let receipt = '';
    let metadata: Record<string, any> = { userId, type };

    if (type === 'purchase' && podcastId) {
      // Check for existing completed purchase
      const existing = await db.select().from(schema.purchases)
        .where(and(
          eq(schema.purchases.userId, userId),
          eq(schema.purchases.podcastId, podcastId),
          eq(schema.purchases.status, 'completed')
        ))
        .limit(1);

      if (existing.length > 0) {
        return new Response(JSON.stringify({ error: 'Already purchased' }), { status: 400, headers });
      }

      const [podcast] = await db.select().from(schema.podcasts)
        .where(eq(schema.podcasts.id, podcastId)).limit(1);

      if (!podcast) {
        return new Response(JSON.stringify({ error: 'Podcast not found' }), { status: 404, headers });
      }

      if (podcast.isFree) {
        return new Response(JSON.stringify({ error: 'This content is free' }), { status: 400, headers });
      }

      finalAmount = parseFloat(podcast.price || '0');
      receipt = `purchase_${podcastId.slice(0, 8)}_${Date.now()}`;
      metadata = { ...metadata, podcastId, podcastTitle: podcast.title };

    } else if (type === 'subscription' && planId) {
      const [plan] = await db.select().from(schema.pricingPlans)
        .where(eq(schema.pricingPlans.id, planId)).limit(1);

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });
      }

      finalAmount = parseFloat(plan.price);
      receipt = `sub_${planId.slice(0, 8)}_${Date.now()}`;
      metadata = { ...metadata, planId, planName: plan.name };

    } else {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), { status: 400, headers });
    }

    if (finalAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400, headers });
    }

    // Create Razorpay order
    const orderData = {
      amount: Math.round(finalAmount * 100),
      currency,
      receipt,
      notes: metadata,
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify(orderData),
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

    // Create pending purchase record
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

    // Record in payment history (table may not exist yet - run migration)
    try {
      await db.insert(schema.paymentHistory).values({
        userId,
        type,
        amount: finalAmount.toString(),
        currency,
        status: 'pending',
        razorpayOrderId: razorpayOrder.id,
        metadata: JSON.stringify(metadata),
      });
    } catch (historyError) {
      console.warn('Payment history insert failed (run migration):', historyError);
    }

    return new Response(JSON.stringify({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: RAZORPAY_KEY_ID,
    }), { status: 200, headers });

  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
