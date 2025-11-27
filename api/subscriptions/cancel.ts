import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const body = await req.json().catch(() => ({}));
    const { immediate = false, reason = '' } = body;

    // Get current subscription with plan
    const subResult = await db.select({
      subscription: schema.subscriptions,
      plan: schema.pricingPlans,
    }).from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.status, 'active')
      ))
      .limit(1);

    // Also check for pending_downgrade status
    if (subResult.length === 0) {
      const pendingResult = await db.select({
        subscription: schema.subscriptions,
        plan: schema.pricingPlans,
      }).from(schema.subscriptions)
        .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
        .where(and(
          eq(schema.subscriptions.userId, userId),
          eq(schema.subscriptions.status, 'pending_downgrade')
        ))
        .limit(1);

      if (pendingResult.length > 0) {
        subResult.push(pendingResult[0]);
      }
    }

    if (subResult.length === 0) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), { status: 404, headers });
    }

    const { subscription, plan } = subResult[0];
    const now = new Date();

    // Check if within refund window
    const subscriptionAge = Math.ceil((now.getTime() - new Date(subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const isWithinRefundWindow = subscriptionAge <= REFUND_WINDOW_DAYS;
    const canRequestRefund = isWithinRefundWindow && parseFloat(plan.price) > 0;

    if (immediate) {
      // Immediate cancellation (no refund, just stop access)
      await db.update(schema.subscriptions)
        .set({
          status: 'cancelled',
          cancelledAt: now,
          cancelAtPeriodEnd: false,
          pendingPlanId: null,
          updatedAt: now,
        })
        .where(eq(schema.subscriptions.id, subscription.id));

      // Record in payment history (table may not exist yet)
      try {
        await db.insert(schema.paymentHistory).values({
          userId,
          type: 'subscription',
          amount: '0',
          currency: plan.currency,
          status: 'completed',
          refId: subscription.id,
          refType: 'subscription',
          metadata: JSON.stringify({
            action: 'cancel_immediate',
            planId: subscription.planId,
            planName: plan.name,
            reason,
          }),
        });
      } catch (e) {
        console.warn('Payment history insert failed:', e);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Subscription cancelled immediately. Access has been revoked.',
        canRequestRefund,
        refundWindowDays: REFUND_WINDOW_DAYS,
        daysRemaining: isWithinRefundWindow ? REFUND_WINDOW_DAYS - subscriptionAge : 0,
      }), { status: 200, headers });

    } else {
      // Cancel at period end (default behavior)
      await db.update(schema.subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          pendingPlanId: null,
          updatedAt: now,
        })
        .where(eq(schema.subscriptions.id, subscription.id));

      // Record in payment history (table may not exist yet)
      try {
        await db.insert(schema.paymentHistory).values({
          userId,
          type: 'subscription',
          amount: '0',
          currency: plan.currency,
          status: 'completed',
          refId: subscription.id,
          refType: 'subscription',
          metadata: JSON.stringify({
            action: 'cancel_at_period_end',
            planId: subscription.planId,
            planName: plan.name,
            effectiveDate: subscription.currentPeriodEnd,
            reason,
          }),
        });
      } catch (e) {
        console.warn('Payment history insert failed:', e);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Subscription will be cancelled on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}. You'll continue to have access until then.`,
        effectiveDate: subscription.currentPeriodEnd,
        canRequestRefund,
        refundWindowDays: REFUND_WINDOW_DAYS,
        daysRemaining: isWithinRefundWindow ? REFUND_WINDOW_DAYS - subscriptionAge : 0,
      }), { status: 200, headers });
    }

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
