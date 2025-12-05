import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { verifyAuth } from '../../api/utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const REFUND_WINDOW_DAYS = 7;

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const auth = await verifyAuth(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }
  const userId = auth.id;

  try {
    // Get active or pending_downgrade subscription
    const result = await db
      .select({
        subscription: schema.subscriptions,
        plan: schema.pricingPlans,
      })
      .from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          or(
            eq(schema.subscriptions.status, 'active'),
            eq(schema.subscriptions.status, 'pending_downgrade')
          )
        )
      )
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (result.length === 0) {
      return new Response(JSON.stringify(null), { status: 200, headers });
    }

    const { subscription, plan } = result[0];
    const now = new Date();

    // Calculate refund eligibility
    const subscriptionAge = Math.ceil(
      (now.getTime() - new Date(subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isWithinRefundWindow = subscriptionAge <= REFUND_WINDOW_DAYS;
    const canRequestRefund = isWithinRefundWindow && parseFloat(plan.price) > 0;

    // Get pending plan if downgrade scheduled
    let pendingPlan: typeof plan | null = null;
    if (subscription.pendingPlanId) {
      const [pp] = await db
        .select()
        .from(schema.pricingPlans)
        .where(eq(schema.pricingPlans.id, subscription.pendingPlanId))
        .limit(1);
      pendingPlan = pp || null;
    }

    // Check for pending refund request
    const [pendingRefund] = await db
      .select()
      .from(schema.refundRequests)
      .where(
        and(
          eq(schema.refundRequests.subscriptionId, subscription.id),
          eq(schema.refundRequests.status, 'pending')
        )
      )
      .limit(1);

    return new Response(
      JSON.stringify({
        ...subscription,
        plan,
        pendingPlan,
        canRequestRefund,
        refundWindowDays: REFUND_WINDOW_DAYS,
        daysUntilRefundExpires: isWithinRefundWindow ? REFUND_WINDOW_DAYS - subscriptionAge : 0,
        hasPendingRefund: !!pendingRefund,
        isExpired: new Date(subscription.currentPeriodEnd) < now,
        daysRemaining: Math.max(
          0,
          Math.ceil(
            (new Date(subscription.currentPeriodEnd).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        ),
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
