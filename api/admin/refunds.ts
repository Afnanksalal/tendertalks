import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';

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

// Edge-compatible base64 encoding
function base64Encode(str: string): string {
  return btoa(str);
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const adminId = req.headers.get('x-user-id');
  if (!adminId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const db = getDb();

  // Verify admin
  const [admin] = await db.select().from(schema.users)
    .where(and(eq(schema.users.id, adminId), eq(schema.users.role, 'admin')))
    .limit(1);

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers });
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');

      let query = db.select({
        refund: schema.refundRequests,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        },
      }).from(schema.refundRequests)
        .leftJoin(schema.users, eq(schema.refundRequests.userId, schema.users.id))
        .orderBy(desc(schema.refundRequests.createdAt));

      const results = await query;

      // Filter by status if provided
      const filtered = status && status !== 'all' 
        ? results.filter(r => r.refund.status === status)
        : results;

      return new Response(JSON.stringify(filtered), { status: 200, headers });

    } catch (error) {
      console.error('Error fetching refunds:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { refundId, action, adminNotes = '' } = body;

      if (!refundId || !action) {
        return new Response(JSON.stringify({ error: 'Refund ID and action required' }), { status: 400, headers });
      }

      const [refundRequest] = await db.select().from(schema.refundRequests)
        .where(eq(schema.refundRequests.id, refundId))
        .limit(1);

      if (!refundRequest) {
        return new Response(JSON.stringify({ error: 'Refund request not found' }), { status: 404, headers });
      }

      if (refundRequest.status !== 'pending' && refundRequest.status !== 'approved') {
        return new Response(JSON.stringify({ error: 'Refund request already processed' }), { status: 400, headers });
      }

      const now = new Date();

      if (action === 'approve') {
        // Approve the refund request (admin will process manually)
        await db.update(schema.refundRequests)
          .set({
            status: 'approved',
            processedBy: adminId,
            adminNotes,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundId));

        return new Response(JSON.stringify({
          success: true,
          message: 'Refund approved. Process the refund manually via Razorpay dashboard.',
        }), { status: 200, headers });

      } else if (action === 'process') {
        // Process refund via Razorpay API
        // First, find the payment ID
        let paymentId: string | null = null;

        if (refundRequest.subscriptionId) {
          const [sub] = await db.select().from(schema.subscriptions)
            .where(eq(schema.subscriptions.id, refundRequest.subscriptionId))
            .limit(1);
          paymentId = sub?.razorpayPaymentId || null;
        } else if (refundRequest.purchaseId) {
          const [purchase] = await db.select().from(schema.purchases)
            .where(eq(schema.purchases.id, refundRequest.purchaseId))
            .limit(1);
          paymentId = purchase?.razorpayPaymentId || null;
        }

        if (!paymentId) {
          return new Response(JSON.stringify({ 
            error: 'Payment ID not found. Process refund manually via Razorpay dashboard.',
            manualRefundRequired: true,
          }), { status: 400, headers });
        }

        // Create refund via Razorpay
        const { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET } = getRazorpayCredentials();
        
        const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${base64Encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
          },
          body: JSON.stringify({
            amount: Math.round(parseFloat(refundRequest.amount) * 100),
            notes: {
              reason: refundRequest.reason || 'Customer requested refund',
              refundRequestId: refundId,
            },
          }),
        });

        if (!refundResponse.ok) {
          const errorText = await refundResponse.text();
          console.error('Razorpay refund error:', refundResponse.status, errorText);
          
          let errorMessage = 'Failed to process refund via Razorpay. Process manually.';
          if (refundResponse.status === 401) {
            errorMessage = 'Invalid Razorpay credentials. Process refund manually.';
          }
          
          return new Response(JSON.stringify({ 
            error: errorMessage,
            razorpayError: errorText,
            manualRefundRequired: true,
          }), { status: 400, headers });
        }

        const razorpayRefund = await refundResponse.json();

        // Update refund request
        await db.update(schema.refundRequests)
          .set({
            status: 'processed',
            razorpayRefundId: razorpayRefund.id,
            processedBy: adminId,
            processedAt: now,
            adminNotes,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundId));

        // Update related records
        if (refundRequest.subscriptionId) {
          await db.update(schema.subscriptions)
            .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
            .where(eq(schema.subscriptions.id, refundRequest.subscriptionId));
        }
        if (refundRequest.purchaseId) {
          await db.update(schema.purchases)
            .set({ status: 'refunded', updatedAt: now })
            .where(eq(schema.purchases.id, refundRequest.purchaseId));
        }

        return new Response(JSON.stringify({
          success: true,
          razorpayRefundId: razorpayRefund.id,
          message: 'Refund processed successfully via Razorpay.',
        }), { status: 200, headers });

      } else if (action === 'mark_processed') {
        // Mark as processed (for manual refunds)
        const { razorpayRefundId } = body;

        await db.update(schema.refundRequests)
          .set({
            status: 'processed',
            razorpayRefundId: razorpayRefundId || null,
            processedBy: adminId,
            processedAt: now,
            adminNotes,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundId));

        // Update related records
        if (refundRequest.subscriptionId) {
          await db.update(schema.subscriptions)
            .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
            .where(eq(schema.subscriptions.id, refundRequest.subscriptionId));
        }
        if (refundRequest.purchaseId) {
          await db.update(schema.purchases)
            .set({ status: 'refunded', updatedAt: now })
            .where(eq(schema.purchases.id, refundRequest.purchaseId));
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Refund marked as processed.',
        }), { status: 200, headers });

      } else if (action === 'reject') {
        await db.update(schema.refundRequests)
          .set({
            status: 'rejected',
            processedBy: adminId,
            processedAt: now,
            adminNotes,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.id, refundId));

        return new Response(JSON.stringify({
          success: true,
          message: 'Refund request rejected.',
        }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });

    } catch (error) {
      console.error('Error processing refund:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}

export const config = { runtime: 'edge' };
