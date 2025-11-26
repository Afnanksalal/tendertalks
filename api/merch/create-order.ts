import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { userId, items, total, shippingAddress } = body;

    if (!userId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers,
      });
    }

    const itemIds = items.map((i: any) => i.merchItemId);
    const merchData = await db
      .select()
      .from(schema.merchItems)
      .where(inArray(schema.merchItems.id, itemIds));

    for (const item of items) {
      const merch = merchData.find(m => m.id === item.merchItemId);
      if (!merch || !merch.inStock) {
        return new Response(JSON.stringify({ error: `${merch?.name || 'Item'} is out of stock` }), {
          status: 400,
          headers,
        });
      }
    }

    const orderData = {
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `merch_${Date.now()}`,
    };

    // Validate Razorpay credentials
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500,
        headers,
      });
    }

    const authString = `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`;
    const base64Auth = typeof btoa !== 'undefined' 
      ? btoa(authString) 
      : Buffer.from(authString).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Auth}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Razorpay order creation failed:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to create payment order', details: errorText }), {
        status: 500,
        headers,
      });
    }

    const razorpayOrder = await response.json();

    const [order] = await db
      .insert(schema.merchOrders)
      .values({
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
      })
      .returning();

    await db.insert(schema.merchOrderItems).values(
      items.map((item: any) => ({
        orderId: order.id,
        merchItemId: item.merchItemId,
        quantity: item.quantity,
        priceAtPurchase: item.price,
      }))
    );

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        dbOrderId: order.id,
        key: RAZORPAY_KEY_ID,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error creating merch order:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = {
  runtime: 'edge',
};
