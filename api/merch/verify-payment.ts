import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq } from 'drizzle-orm';

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

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  try {
    const RAZORPAY_KEY_SECRET = getRazorpaySecret();
    const encoder = new TextEncoder();
    const data = encoder.encode(`${orderId}|${paymentId}`);
    const key = encoder.encode(RAZORPAY_KEY_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment details' }), {
        status: 400,
        headers,
      });
    }

    const db = getDb();

    // Idempotency check - prevent double processing
    const [existingOrder] = await db.select().from(schema.merchOrders)
      .where(eq(schema.merchOrders.razorpayOrderId, razorpay_order_id))
      .limit(1);
    
    if (existingOrder && existingOrder.status === 'paid') {
      return new Response(JSON.stringify({ 
        success: true, 
        order: existingOrder,
        message: 'Payment already processed'
      }), { status: 200, headers });
    }

    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      await db
        .update(schema.merchOrders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(schema.merchOrders.razorpayOrderId, razorpay_order_id));

      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers,
      });
    }

    const [order] = await db
      .update(schema.merchOrders)
      .set({
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        updatedAt: new Date(),
      })
      .where(eq(schema.merchOrders.razorpayOrderId, razorpay_order_id))
      .returning();

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers,
      });
    }

    const orderItems = await db
      .select()
      .from(schema.merchOrderItems)
      .where(eq(schema.merchOrderItems.orderId, order.id));

    for (const item of orderItems) {
      const [merch] = await db
        .select()
        .from(schema.merchItems)
        .where(eq(schema.merchItems.id, item.merchItemId));

      if (merch && merch.stockQuantity !== null) {
        const newStock = Math.max(0, merch.stockQuantity - item.quantity);
        await db
          .update(schema.merchItems)
          .set({
            stockQuantity: newStock,
            inStock: newStock > 0,
            updatedAt: new Date(),
          })
          .where(eq(schema.merchItems.id, item.merchItemId));
      }
    }

    // Update payment history
    try {
      await db.update(schema.paymentHistory)
        .set({
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          updatedAt: new Date(),
        })
        .where(eq(schema.paymentHistory.razorpayOrderId, razorpay_order_id));
    } catch (e) {
      console.warn('Payment history update failed:', e);
    }

    return new Response(JSON.stringify({ success: true, order }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error verifying merch payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
