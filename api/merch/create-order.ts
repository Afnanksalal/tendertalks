import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { merchOrders, merchOrderItems, merchItems } from '../../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { userId, items, total, shippingAddress } = body;

    if (!userId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify stock availability
    const itemIds = items.map((i: any) => i.merchItemId);
    const merchData = await db
      .select()
      .from(merchItems)
      .where(inArray(merchItems.id, itemIds));

    for (const item of items) {
      const merch = merchData.find(m => m.id === item.merchItemId);
      if (!merch || !merch.inStock) {
        return new Response(JSON.stringify({ error: `${merch?.name || 'Item'} is out of stock` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Create Razorpay order
    const orderData = {
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `merch_${Date.now()}`,
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error('Failed to create Razorpay order');
    }

    const razorpayOrder = await response.json();

    // Create order in database
    const [order] = await db
      .insert(merchOrders)
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

    // Create order items
    await db.insert(merchOrderItems).values(
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
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating merch order:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  runtime: 'edge',
};
