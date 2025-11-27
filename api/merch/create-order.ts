import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { inArray } from 'drizzle-orm';

// Lazy initialization to avoid errors at module load time
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const sql_client = neon(process.env.DATABASE_URL);
  return drizzle(sql_client, { schema });
}

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return { keyId, keySecret };
}

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

    console.log('Create merch order request:', { userId, itemCount: items?.length, total });

    if (!userId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request - userId and items required' }), { status: 400, headers });
    }

    // Validate total
    if (!total || isNaN(total) || total <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid total amount' }), { status: 400, headers });
    }

    // Get credentials
    const { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET } = getRazorpayCredentials();

    // Validate Razorpay credentials
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials - RAZORPAY_KEY_ID:', !!RAZORPAY_KEY_ID, 'RAZORPAY_KEY_SECRET:', !!RAZORPAY_KEY_SECRET);
      return new Response(JSON.stringify({ error: 'Payment gateway not configured. Please contact support.' }), { status: 500, headers });
    }

    console.log('Razorpay credentials present, validating items...');

    // Get database connection
    let db;
    try {
      db = getDb();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return new Response(JSON.stringify({ error: 'Database connection failed' }), { status: 500, headers });
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

    console.log('Items validated, creating Razorpay order...');

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

    console.log('Razorpay order data:', orderData);

    const authString = `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`;
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Encode(authString)}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('Razorpay order creation failed:', razorpayResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to create payment order',
        details: `Razorpay returned ${razorpayResponse.status}`
      }), { status: 500, headers });
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log('Razorpay order created:', razorpayOrder.id);

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
        priceAtPurchase: String(item.price),
      }))
    );

    // Record in payment history (table may not exist yet - run migration)
    try {
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
    } catch (historyError) {
      // Table may not exist yet - log but continue
      console.warn('Payment history insert failed (run migration):', historyError);
    }

    return new Response(JSON.stringify({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      dbOrderId: order.id,
      key: RAZORPAY_KEY_ID, // This is safe to expose - it's the public key
    }), { status: 200, headers });

  } catch (error) {
    console.error('Error creating merch order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        // Include debug info in development
        ...(process.env.NODE_ENV !== 'production' && { debug: errorDetails })
      }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
