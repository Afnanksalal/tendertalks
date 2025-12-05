import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

// Refund window in days
const REFUND_WINDOW_DAYS = 7;

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

  try {
    const user = await verifyAuth(req);
    const userId = user.id;

    const body = await req.json();
    const { subscriptionId, purchaseId, reason = '' } = body;

    if (!subscriptionId && !purchaseId) {
      return new Response(JSON.stringify({ error: 'Subscription ID or Purchase ID required' }), {
        status: 400,
        headers,
      });
    }

    const now = new Date();
    let amount = '0';
    let currency = 'INR';
    let paymentHistoryId: string | null = null;

    // Check for existing pending refund request
    const existingRequest = await db
      .select()
      .from(schema.refundRequests)
      .where(
        and(
          eq(schema.refundRequests.userId, userId),
          eq(schema.refundRequests.status, 'pending'),
          subscriptionId
            ? eq(schema.refundRequests.subscriptionId, subscriptionId)
            : eq(schema.refundRequests.purchaseId, purchaseId!)
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return new Response(
        JSON.stringify({ error: 'A refund request is already pending for this item' }),
        { status: 400, headers }
      );
    }

    if (subscriptionId) {
      // Subscription refund request
      const [subscription] = await db
        .select()
        .from(schema.subscriptions)
        .where(
          and(eq(schema.subscriptions.id, subscriptionId), eq(schema.subscriptions.userId, userId))
        )
        .limit(1);

      if (!subscription) {
        return new Response(JSON.stringify({ error: 'Subscription not found' }), {
          status: 404,
          headers,
        });
      }

      // Check refund window
      const subscriptionAge = Math.ceil(
        (now.getTime() - new Date(subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (subscriptionAge > REFUND_WINDOW_DAYS) {
        return new Response(
          JSON.stringify({
            error: `Refund window has expired. Refunds are only available within ${REFUND_WINDOW_DAYS} days of purchase.`,
            daysElapsed: subscriptionAge,
            refundWindowDays: REFUND_WINDOW_DAYS,
          }),
          { status: 400, headers }
        );
      }

      amount = subscription.amount || '0';
      currency = subscription.currency || 'INR';

      // Find related payment history
      const [paymentEntry] = await db
        .select()
        .from(schema.paymentHistory)
        .where(
          and(
            eq(schema.paymentHistory.refId, subscriptionId),
            eq(schema.paymentHistory.refType, 'subscription'),
            eq(schema.paymentHistory.status, 'completed')
          )
        )
        .orderBy(desc(schema.paymentHistory.createdAt))
        .limit(1);

      if (paymentEntry) {
        paymentHistoryId = paymentEntry.id;
      }
    } else if (purchaseId) {
      // Purchase refund request
      const [purchase] = await db
        .select()
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.id, purchaseId),
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.status, 'completed')
          )
        )
        .limit(1);

      if (!purchase) {
        return new Response(JSON.stringify({ error: 'Purchase not found or not completed' }), {
          status: 404,
          headers,
        });
      }

      // Check refund window
      const purchaseAge = Math.ceil(
        (now.getTime() - new Date(purchase.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (purchaseAge > REFUND_WINDOW_DAYS) {
        return new Response(
          JSON.stringify({
            error: `Refund window has expired. Refunds are only available within ${REFUND_WINDOW_DAYS} days of purchase.`,
            daysElapsed: purchaseAge,
            refundWindowDays: REFUND_WINDOW_DAYS,
          }),
          { status: 400, headers }
        );
      }

      amount = purchase.amount;
      currency = purchase.currency;
    }

    // Create refund request
    const [refundRequest] = await db
      .insert(schema.refundRequests)
      .values({
        userId,
        subscriptionId: subscriptionId || null,
        purchaseId: purchaseId || null,
        paymentHistoryId,
        amount,
        currency,
        reason,
        status: 'pending',
      })
      .returning();

    return new Response(
      JSON.stringify({
        success: true,
        refundRequest,
        message: 'Refund request submitted. Our team will review it within 2-3 business days.',
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error creating refund request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
