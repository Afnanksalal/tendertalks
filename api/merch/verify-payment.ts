import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { merchOrders, merchOrderItems, merchItems } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
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
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    // Verify signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      await db
        .update(merchOrders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(merchOrders.razorpayOrderId, razorpay_order_id));

      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update order status
    const [order] = await db
      .update(merchOrders)
      .set({
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        updatedAt: new Date(),
      })
      .where(eq(merchOrders.razorpayOrderId, razorpay_order_id))
      .returning();

    // Update stock quantities
    const orderItems = await db
      .select()
      .from(merchOrderItems)
      .where(eq(merchOrderItems.orderId, order.id));

    for (const item of orderItems) {
      const [merch] = await db
        .select()
        .from(merchItems)
        .where(eq(merchItems.id, item.merchItemId));

      if (merch && merch.stockQuantity !== null) {
        const newStock = Math.max(0, merch.stockQuantity - item.quantity);
        await db
          .update(merchItems)
          .set({
            stockQuantity: newStock,
            inStock: newStock > 0,
            updatedAt: new Date(),
          })
          .where(eq(merchItems.id, item.merchItemId));
      }
    }

    return new Response(JSON.stringify({ success: true, order }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error verifying merch payment:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  runtime: 'edge',
};
