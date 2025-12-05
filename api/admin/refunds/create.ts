import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

async function processRazorpayRefund(
  paymentId: string,
  amount: number,
  notes: Record<string, string>
) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Payment gateway not configured');

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify({ amount: Math.round(amount * 100), notes }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.description || 'Refund failed');
  }

  return response.json();
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  let adminId: string;
  try {
    const authUser = await verifyAuth(req);
    adminId = authUser.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const db = getDb();

  const [admin] = await db.select().from(schema.users).where(eq(schema.users.id, adminId)).limit(1);
  if (!admin || admin.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  try {
    const { paymentId, amount, reason, processImmediately = false } = await req.json();

    if (!paymentId)
      return new Response(JSON.stringify({ error: 'Payment ID required' }), {
        status: 400,
        headers,
      });

    const [payment] = await db
      .select()
      .from(schema.paymentHistory)
      .where(eq(schema.paymentHistory.razorpayPaymentId, paymentId))
      .limit(1);

    if (!payment)
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers });

    const refundAmount = amount || parseFloat(payment.amount);
    const now = new Date();

    const [refundRequest] = await db
      .insert(schema.refundRequests)
      .values({
        userId: payment.userId,
        paymentHistoryId: payment.id,
        subscriptionId: payment.refType === 'subscription' ? payment.refId : null,
        purchaseId: payment.refType === 'purchase' ? payment.refId : null,
        amount: refundAmount.toString(),
        currency: payment.currency,
        reason: reason || 'Admin initiated refund',
        status: processImmediately ? 'approved' : 'pending',
        processedBy: adminId,
      })
      .returning();

    if (processImmediately) {
      try {
        const razorpayRefund = await processRazorpayRefund(paymentId, refundAmount, {
          reason: reason || 'Admin initiated refund',
          refundRequestId: refundRequest.id,
          adminId,
        });

        await db
          .update(schema.refundRequests)
          .set({
            status: 'processed',
            razorpayRefundId: razorpayRefund.id,
            processedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundRequest.id));

        await db
          .update(schema.paymentHistory)
          .set({ status: 'refunded', updatedAt: now })
          .where(eq(schema.paymentHistory.id, payment.id));

        if (payment.refType === 'subscription' && payment.refId) {
          await db
            .update(schema.subscriptions)
            .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
            .where(eq(schema.subscriptions.id, payment.refId));
        }
        if (payment.refType === 'purchase' && payment.refId) {
          await db
            .update(schema.purchases)
            .set({ status: 'refunded', updatedAt: now })
            .where(eq(schema.purchases.id, payment.refId));
        }

        return new Response(
          JSON.stringify({
            success: true,
            refundRequestId: refundRequest.id,
            razorpayRefundId: razorpayRefund.id,
          }),
          { status: 200, headers }
        );
      } catch (error) {
        await db
          .update(schema.refundRequests)
          .set({
            adminNotes: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundRequest.id));

        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Refund failed',
            refundRequestId: refundRequest.id,
          }),
          { status: 400, headers }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundRequestId: refundRequest.id,
        message: 'Refund request created',
      }),
      { status: 201, headers }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
