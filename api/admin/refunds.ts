import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  let adminId: string;
  try {
    const user = await verifyAuth(req);
    adminId = user.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const db = getDb();

  const [admin] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, adminId), eq(schema.users.role, 'admin')))
    .limit(1);
  if (!admin)
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');

      const results = await db
        .select({
          refund: schema.refundRequests,
          user: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
        })
        .from(schema.refundRequests)
        .leftJoin(schema.users, eq(schema.refundRequests.userId, schema.users.id))
        .orderBy(desc(schema.refundRequests.createdAt));

      const filtered =
        status && status !== 'all' ? results.filter((r) => r.refund.status === status) : results;
      return new Response(JSON.stringify(filtered), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { refundId, action, adminNotes = '', razorpayRefundId } = await req.json();

      if (!refundId || !action) {
        return new Response(JSON.stringify({ error: 'Refund ID and action required' }), {
          status: 400,
          headers,
        });
      }

      const [refundRequest] = await db
        .select()
        .from(schema.refundRequests)
        .where(eq(schema.refundRequests.id, refundId))
        .limit(1);

      if (!refundRequest)
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
      if (!['pending', 'approved'].includes(refundRequest.status)) {
        return new Response(JSON.stringify({ error: 'Already processed' }), {
          status: 400,
          headers,
        });
      }

      const now = new Date();

      if (action === 'approve') {
        await db
          .update(schema.refundRequests)
          .set({ status: 'approved', processedBy: adminId, adminNotes, updatedAt: now })
          .where(eq(schema.refundRequests.id, refundId));
        return new Response(JSON.stringify({ success: true, message: 'Approved' }), {
          status: 200,
          headers,
        });
      } else if (action === 'process') {
        let paymentId: string | null = null;
        if (refundRequest.subscriptionId) {
          const [sub] = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.id, refundRequest.subscriptionId))
            .limit(1);
          paymentId = sub?.razorpayPaymentId || null;
        } else if (refundRequest.purchaseId) {
          const [purchase] = await db
            .select()
            .from(schema.purchases)
            .where(eq(schema.purchases.id, refundRequest.purchaseId))
            .limit(1);
          paymentId = purchase?.razorpayPaymentId || null;
        }

        if (!paymentId) {
          return new Response(
            JSON.stringify({ error: 'Payment ID not found', manualRefundRequired: true }),
            { status: 400, headers }
          );
        }

        const razorpayRefund = await processRazorpayRefund(
          paymentId,
          parseFloat(refundRequest.amount),
          { refundRequestId: refundId }
        );

        await db
          .update(schema.refundRequests)
          .set({
            status: 'processed',
            razorpayRefundId: razorpayRefund.id,
            processedBy: adminId,
            processedAt: now,
            adminNotes,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundId));

        if (refundRequest.subscriptionId) {
          await db
            .update(schema.subscriptions)
            .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
            .where(eq(schema.subscriptions.id, refundRequest.subscriptionId));
        }
        if (refundRequest.purchaseId) {
          await db
            .update(schema.purchases)
            .set({ status: 'refunded', updatedAt: now })
            .where(eq(schema.purchases.id, refundRequest.purchaseId));
        }

        return new Response(
          JSON.stringify({ success: true, razorpayRefundId: razorpayRefund.id }),
          { status: 200, headers }
        );
      } else if (action === 'mark_processed') {
        await db
          .update(schema.refundRequests)
          .set({
            status: 'processed',
            razorpayRefundId: razorpayRefundId || null,
            processedBy: adminId,
            processedAt: now,
            adminNotes,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundId));

        if (refundRequest.subscriptionId) {
          await db
            .update(schema.subscriptions)
            .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
            .where(eq(schema.subscriptions.id, refundRequest.subscriptionId));
        }
        if (refundRequest.purchaseId) {
          await db
            .update(schema.purchases)
            .set({ status: 'refunded', updatedAt: now })
            .where(eq(schema.purchases.id, refundRequest.purchaseId));
        }

        return new Response(JSON.stringify({ success: true, message: 'Marked as processed' }), {
          status: 200,
          headers,
        });
      } else if (action === 'reject') {
        await db
          .update(schema.refundRequests)
          .set({
            status: 'rejected',
            processedBy: adminId,
            processedAt: now,
            adminNotes,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundId));
        return new Response(JSON.stringify({ success: true, message: 'Rejected' }), {
          status: 200,
          headers,
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
        { status: 500, headers }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}

export const config = { runtime: 'edge' };
