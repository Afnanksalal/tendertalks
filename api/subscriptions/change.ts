import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

function base64Encode(str: string): string {
  if (typeof btoa !== 'undefined') return btoa(str);
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

  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const body = await req.json();
    const { newPlanId, currency = 'INR' } = body;

    if (!newPlanId) {
      return new Response(JSON.stringify({ error: 'New plan ID required' }), { status: 400, headers });
    }

    // Get current subscription with plan
    const currentSubResult = await db.select({
      subscription: schema.subscriptions,
      plan: schema.pricingPlans,
    }).from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.status, 'active')
      ))
      .limit(1);

    if (currentSubResult.length === 0) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), { status: 404, headers });
    }

    const { subscription: currentSub, plan: currentPlan } = currentSubResult[0];

    if (currentSub.planId === newPlanId) {
      return new Response(JSON.stringify({ error: 'Already on this plan' }), { status: 400, headers });
    }

    // Get new plan
    const [newPlan] = await db.select().from(schema.pricingPlans)
      .where(and(eq(schema.pricingPlans.id, newPlanId), eq(schema.pricingPlans.isActive, true)))
      .limit(1);

    if (!newPlan) {
      return new Response(JSON.stringify({ error: 'New plan not found or inactive' }), { status: 404, headers });
    }

    const currentPrice = parseFloat(currentPlan.price);
    const newPrice = parseFloat(newPlan.price);

    // Determine if upgrade or downgrade
    const isUpgrade = newPrice > currentPrice;
    const action = isUpgrade ? 'upgrade' : 'downgrade';

    if (isUpgrade) {
      // UPGRADE: Pay difference immediately, switch plan now
      // Calculate prorated amount (remaining days value)
      const now = new Date();
      const periodEnd = new Date(currentSub.currentPeriodEnd);
      const periodStart = new Date(currentSub.currentPeriodStart);
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Credit from current plan
      const dailyRateCurrent = currentPrice / totalDays;
      const credit = dailyRateCurrent * remainingDays;
      
      // Amount for new plan (full price minus credit)
      const amountToPay = Math.max(0, newPrice - credit);

      if (amountToPay === 0) {
        // No payment needed, just switch
        const newPeriodEnd = new Date(now);
        if (newPlan.interval === 'year') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        } else {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        }

        await db.update(schema.subscriptions)
          .set({
            planId: newPlanId,
            amount: newPlan.price,
            currentPeriodStart: now,
            currentPeriodEnd: newPeriodEnd,
            updatedAt: now,
          })
          .where(eq(schema.subscriptions.id, currentSub.id));

        return new Response(JSON.stringify({
          success: true,
          requiresPayment: false,
          message: 'Upgraded successfully! Credit applied from previous plan.',
        }), { status: 200, headers });
      }

      // Create Razorpay order for upgrade
      const receipt = `sub_upgrade_${newPlanId.slice(0, 8)}_${Date.now()}`;
      const orderData = {
        amount: Math.round(amountToPay * 100),
        currency,
        receipt,
        notes: {
          userId,
          planId: newPlanId,
          type: 'subscription',
          action: 'upgrade',
          fromPlanId: currentSub.planId,
          credit: credit.toFixed(2),
        },
      };

      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${base64Encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!razorpayResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const razorpayOrder = await razorpayResponse.json();

      // Record in payment history (table may not exist yet)
      try {
        await db.insert(schema.paymentHistory).values({
          userId,
          type: 'upgrade',
          amount: amountToPay.toString(),
          currency,
          status: 'pending',
          razorpayOrderId: razorpayOrder.id,
          metadata: JSON.stringify({
            planId: newPlanId,
            action: 'upgrade',
            fromPlanId: currentSub.planId,
            fromPlanName: currentPlan.name,
            toPlanName: newPlan.name,
            credit: credit.toFixed(2),
            originalPrice: newPrice,
          }),
        });
      } catch (e) {
        console.warn('Payment history insert failed:', e);
      }

      return new Response(JSON.stringify({
        requiresPayment: true,
        action: 'upgrade',
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: RAZORPAY_KEY_ID,
        planId: newPlanId,
        planName: newPlan.name,
        credit: credit.toFixed(2),
        originalPrice: newPrice,
        message: `Upgrade to ${newPlan.name}. Credit of ₹${credit.toFixed(0)} applied.`,
      }), { status: 200, headers });

    } else {
      // DOWNGRADE: Schedule for end of current period (no refund)
      const now = new Date();
      
      await db.update(schema.subscriptions)
        .set({
          pendingPlanId: newPlanId,
          cancelAtPeriodEnd: false,
          updatedAt: now,
        })
        .where(eq(schema.subscriptions.id, currentSub.id));

      // Record in payment history (no charge, table may not exist)
      try {
        await db.insert(schema.paymentHistory).values({
          userId,
          type: 'downgrade',
          amount: '0',
          currency,
          status: 'completed',
          refId: currentSub.id,
          refType: 'subscription',
          metadata: JSON.stringify({
            fromPlanId: currentSub.planId,
            fromPlanName: currentPlan.name,
            toPlanId: newPlanId,
            toPlanName: newPlan.name,
            effectiveDate: currentSub.currentPeriodEnd,
          }),
        });
      } catch (e) {
        console.warn('Payment history insert failed:', e);
      }

      return new Response(JSON.stringify({
        success: true,
        requiresPayment: false,
        action: 'downgrade',
        effectiveDate: currentSub.currentPeriodEnd,
        message: `Downgrade scheduled. You'll continue with ${currentPlan.name} until ${new Date(currentSub.currentPeriodEnd).toLocaleDateString()}, then switch to ${newPlan.name}.`,
      }), { status: 200, headers });
    }

  } catch (error) {
    console.error('Error changing subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
