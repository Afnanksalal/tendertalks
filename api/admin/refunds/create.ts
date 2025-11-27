import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// Lazy initialization
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
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }
  return { keyId, keySecret };
}

// Base64 encoding for Node.js runtime
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
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

  const adminId = req.headers.get('x-user-id');
  if (!adminId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const db = getDb();

  const [admin] = await db.select().from(schema.users)
    .where(and(eq(schema.users.id, adminId), eq(schema.users.role, 'admin')))
    .limit(1);

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers });
  }

  try {
    const body = await req.json();
    const { paymentId, amount, reason, processImmediately = false } = body;

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Payment ID required' }), { status: 400, headers });
    }

    // Find the payment in our records
    const [payment] = await db.select()
      .from(schema.paymentHistory)
      .where(eq(schema.paymentHistory.razorpayPaymentId, paymentId))
      .limit(1);

    if (!payment) {
      return new Response(JSON.stringify({ error: 'Payment not found in records' }), { status: 404, headers });
    }

    const refundAmount = amount || parseFloat(payment.amount);
    const now = new Date();

    // Create refund request
    const [refundRequest] = await db.insert(schema.refundRequests).values({
      userId: payment.userId,
      paymentHistoryId: payment.id,
      subscriptionId: payment.refType === 'subscription' ? payment.refId : null,
      purchaseId: payment.refType === 'purchase' ? payment.refId : null,
      amount: refundAmount.toString(),
      currency: payment.currency,
      reason: reason || 'Admin initiated refund',
      status: processImmediately ? 'approved' : 'pending',
      processedBy: adminId,
    }).returning();

    if (processImmediately) {
      // Process refund via Razorpay
      const { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET } = getRazorpayCredentials();
      
      const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        },
        body: JSON.stringify({
          amount: Math.round(refundAmount * 100),
          notes: {
            reason: reason || 'Admin initiated refund',
            refundRequestId: refundRequest.id,
            adminId,
          },
        }),
      });

      if (!refundResponse.ok) {
        const errorText = await refundResponse.text();
        console.error('Razorpay refund error:', refundResponse.status, errorText);
        
        let errorMessage = 'Failed to process refund via Razorpay';
        if (refundResponse.status === 401) {
          errorMessage = 'Invalid Razorpay credentials';
        }
        
        // Update refund request with error
        await db.update(schema.refundRequests)
          .set({ adminNotes: `Razorpay error: ${errorText}`, updatedAt: now })
          .where(eq(schema.refundRequests.id, refundRequest.id));

        return new Response(JSON.stringify({ 
          error: errorMessage,
          refundRequestId: refundRequest.id,
          razorpayError: errorText,
        }), { status: 400, headers });
      }

      const razorpayRefund = await refundResponse.json();

      // Update refund request
      await db.update(schema.refundRequests)
        .set({
          status: 'processed',
          razorpayRefundId: razorpayRefund.id,
          processedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.refundRequests.id, refundRequest.id));

      // Update payment history
      await db.update(schema.paymentHistory)
        .set({ status: 'refunded', updatedAt: now })
        .where(eq(schema.paymentHistory.id, payment.id));

      // Update related records
      if (payment.refType === 'subscription' && payment.refId) {
        await db.update(schema.subscriptions)
          .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
          .where(eq(schema.subscriptions.id, payment.refId));
      }
      if (payment.refType === 'purchase' && payment.refId) {
        await db.update(schema.purchases)
          .set({ status: 'refunded', updatedAt: now })
          .where(eq(schema.purchases.id, payment.refId));
      }

      return new Response(JSON.stringify({
        success: true,
        refundRequestId: refundRequest.id,
        razorpayRefundId: razorpayRefund.id,
        message: 'Refund processed successfully',
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      refundRequestId: refundRequest.id,
      message: 'Refund request created. Process it from the refunds manager.',
    }), { status: 201, headers });

  } catch (error) {
    console.error('Error creating refund:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}

export const config = { runtime: 'nodejs' };
