import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

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
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
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
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const db = getDb();

    // Check if merch feature is enabled
    const [merchSetting] = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, 'feature_merch'))
      .limit(1);

    if (merchSetting && merchSetting.value === 'false') {
      return new Response(JSON.stringify({ error: 'Store is currently disabled' }), {
        status: 403,
        headers,
      });
    }

    interface OrderItem {
      merchItemId: string;
      quantity: number;
      price?: number;
    }

    interface ShippingAddress {
      address: string;
      city: string;
      state: string;
      zip: string;
      country?: string;
    }

    const { userId, items, total, shippingAddress } = (await req.json()) as {
      userId: string;
      items: OrderItem[];
      total: number;
      shippingAddress: ShippingAddress;
    };

    if (!userId || !items?.length) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
    }

    if (!total || total < 1) {
      return new Response(JSON.stringify({ error: 'Minimum order is ₹1' }), {
        status: 400,
        headers,
      });
    }

    // Validate items
    const itemIds = items.map((i) => i.merchItemId);
    const merchData = await db
      .select()
      .from(schema.merchItems)
      .where(inArray(schema.merchItems.id, itemIds));
    for (const item of items) {
      const merch = merchData.find((m) => m.id === item.merchItemId);
      if (!merch) {
        return new Response(JSON.stringify({ error: `Item not found` }), { status: 404, headers });
      }
      if (!merch.inStock) {
        return new Response(JSON.stringify({ error: `${merch.name} is out of stock` }), {
          status: 400,
          headers,
        });
      }
    }

    // Create Razorpay order
    const { order: razorpayOrder, keyId } = await createRazorpayOrder(
      total,
      `merch_${Date.now()}`,
      { userId, type: 'merch', itemCount: String(items.length) }
    );

    // Create database order
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
      items.map((item) => ({
        orderId: order.id,
        merchItemId: item.merchItemId,
        quantity: item.quantity,
        priceAtPurchase: String(item.price),
      }))
    );

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        dbOrderId: order.id,
        key: keyId,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
