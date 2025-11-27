import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { inArray } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

function base64Encode(str: string): string {
  if (typeof btoa !== 'undefined') return btoa(str);
  return Buffer.from(str).toString('base64');
}

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { userId, items, total, shippingAddress } = body;

    if (!userId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request - userId and items required' }), { status: 400, headers });
    }

    // Validate Razorpay credentials
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials - RAZORPAY_KEY_ID:', !!RAZORPAY_KEY_ID, 'RAZORPAY_KEY_SECRET:', !!RAZORPAY_KEY_SECRET);
      return new Response(JSON.stringify({ error: 'Payment gateway not configured. Please contact support.' }), { status: 500, headers });
    }

    // Validate items exist and are in stock
    const itemIds = items.map((i: any) => i.merchItemId);
    const merchData = await db.select().from(schema.merchItems)
      .where(inArray(schema.merchItems.id, itemIds));

    for (const item of items) {
      const merch = merchData.find(m => m.id === item.merchItemId);
      if (!merch) {
        return new Response(JSON.stringify({ error: `Item not found: ${item.merchItemId}` }), { status: 404, headers });
      }
      if (!merch.inStock) {
        return new Response(JSON.stringify({ error: `${merch.name} is out of stock` }), { status: 400, headers });
      }
    }

    // Create Razorpay order
    const orderData = {
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `merch_${Date.now()}`,
      notes: {
        userId,
        type: 'merch',
        itemCount: items.length,
      },
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('Razorpay order creation failed:', razorpayResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to create payment order' }), { status: 500, headers });
    }

    const razorpayOrder = await razorpayResponse.json();

    // Create merch order in database
    const [order] = await db.insert(schema.merchOrders).values({
      userId,
      status: 'pending',
      totalAmount: total.toString(),
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      shippingAddress: shippingAddress?.address,
      shippingCity: shippingAddress?.city,
      shippingState: shippingAddress?.state,
      shippingZip: shippingAddress?.zip,
      shippingCountry: shippingAddress?.country || 'India',
    }).returning();

    // Create order items
    await db.insert(schema.merchOrderItems).values(
      items.map((item: any) => ({
        orderId: order.id,
        merchItemId: item.merchItemId,
        quantity: item.quantity,
        priceAtPurchase: item.price,
      }))
    );

    // Record in payment history
    await db.insert(schema.paymentHistory).values({
      userId,
      type: 'merch',
      amount: total.toString(),
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
      refId: order.id,
      refType: 'merch_order',
      metadata: JSON.stringify({ itemCount: items.length, items: items.map((i: any) => i.merchItemId) }),
    });

    return new Response(JSON.stringify({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      dbOrderId: order.id,
      key: RAZORPAY_KEY_ID,
    }), { status: 200, headers });

  } catch (error) {
    console.error('Error creating merch order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
