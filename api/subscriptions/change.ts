import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

async function createRazorpayOrder(amount: number, receipt: string, notes: Record<string, string>) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    throw new Error('Payment gateway not configured');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.description || 'Failed to create payment order');
  }

  return { order: await response.json(), keyId };
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

  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const { newPlanId, currency = 'INR' } = await req.json();

    if (!newPlanId) {
      return new Response(JSON.stringify({ error: 'New plan ID required' }), { status: 400, headers });
    }

    const db = getDb();

    const currentSubResult = await db.select({
      subscription: schema.subscriptions,
      plan: schema.pricingPlans,
    }).from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active')))
      .limit(1);

    if (currentSubResult.length === 0) {
      return new Response(JSON.stringify({ error: 'No active subscription' }), { status: 404, headers });
    }

    const { subscription: currentSub, plan: currentPlan } = currentSubResult[0];

    if (currentSub.planId === newPlanId) {
      return new Response(JSON.stringify({ error: 'Already on this plan' }), { status: 400, headers });
    }

    const [newPlan] = await db.select().from(schema.pricingPlans)
      .where(and(eq(schema.pricingPlans.id, newPlanId), eq(schema.pricingPlans.isActive, true)))
      .limit(1);

    if (!newPlan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });
    }

    const currentPrice = parseFloat(currentPlan.price);
    const newPrice = parseFloat(newPlan.price);
    const isUpgrade = newPrice > currentPrice;

    if (isUpgrade) {
      const now = new Date();
      const periodEnd = new Date(currentSub.currentPeriodEnd);
      const periodStart = new Date(currentSub.currentPeriodStart);
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      const credit = (currentPrice / totalDays) * remainingDays;
      const amountToPay = Math.max(0, newPrice - credit);

      if (amountToPay === 0) {
        const newPeriodEnd = new Date(now);
        newPlan.interval === 'year' 
          ? newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
          : newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await db.update(schema.subscriptions)
          .set({ planId: newPlanId, amount: newPlan.price, currentPeriodStart: now, currentPeriodEnd: newPeriodEnd, updatedAt: now })
          .where(eq(schema.subscriptions.id, currentSub.id));

        return new Response(JSON.stringify({
          success: true,
          requiresPayment: false,
          message: 'Upgraded successfully!',
        }), { status: 200, headers });
      }

      const { order: razorpayOrder, keyId } = await createRazorpayOrder(
        amountToPay,
        `sub_upgrade_${newPlanId.slice(0, 8)}_${Date.now()}`,
        { userId, planId: newPlanId, type: 'subscription', action: 'upgrade', fromPlanId: currentSub.planId }
      );

      return new Response(JSON.stringify({
        requiresPayment: true,
        action: 'upgrade',
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: keyId,
        planId: newPlanId,
        planName: newPlan.name,
        credit: credit.toFixed(2),
        message: `Upgrade to ${newPlan.name}. Credit of ₹${credit.toFixed(0)} applied.`,
      }), { status: 200, headers });

    } else {
      const now = new Date();
      await db.update(schema.subscriptions)
        .set({ pendingPlanId: newPlanId, cancelAtPeriodEnd: false, updatedAt: now })
        .where(eq(schema.subscriptions.id, currentSub.id));

      return new Response(JSON.stringify({
        success: true,
        requiresPayment: false,
        action: 'downgrade',
        effectiveDate: currentSub.currentPeriodEnd,
        message: `Downgrade scheduled for ${new Date(currentSub.currentPeriodEnd).toLocaleDateString()}.`,
      }), { status: 200, headers });
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
