import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

async function verifyAdmin(userId: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return user?.role === 'admin';
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  let userId: string;
  try {
    const user = await verifyAuth(req);
    userId = user.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  if (!(await verifyAdmin(userId))) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');

      const conditions: ReturnType<typeof eq>[] = [];
      if (status && status !== 'all') {
        conditions.push(eq(schema.subscriptions.status, status as schema.Subscription['status']));
      }

      const subscriptions = await db
        .select({
          id: schema.subscriptions.id,
          status: schema.subscriptions.status,
          amount: schema.subscriptions.amount,
          currency: schema.subscriptions.currency,
          currentPeriodStart: schema.subscriptions.currentPeriodStart,
          currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: schema.subscriptions.cancelAtPeriodEnd,
          razorpaySubscriptionId: schema.subscriptions.razorpaySubscriptionId,
          createdAt: schema.subscriptions.createdAt,
          user: {
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
          },
          plan: {
            id: schema.pricingPlans.id,
            name: schema.pricingPlans.name,
            price: schema.pricingPlans.price,
            interval: schema.pricingPlans.interval,
          },
        })
        .from(schema.subscriptions)
        .leftJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
        .leftJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.subscriptions.createdAt));

      return new Response(JSON.stringify(subscriptions), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { subscriptionId, action, data } = body;

      if (!subscriptionId || !action) {
        return new Response(JSON.stringify({ error: 'Subscription ID and action required' }), {
          status: 400,
          headers,
        });
      }

      const [subscription] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription) {
        return new Response(JSON.stringify({ error: 'Subscription not found' }), {
          status: 404,
          headers,
        });
      }

      const now = new Date();

      switch (action) {
        case 'cancel': {
          await db
            .update(schema.subscriptions)
            .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
            .where(eq(schema.subscriptions.id, subscriptionId));
          return new Response(
            JSON.stringify({ success: true, message: 'Subscription cancelled' }),
            { status: 200, headers }
          );
        }

        case 'pause': {
          await db
            .update(schema.subscriptions)
            .set({ status: 'paused', updatedAt: now })
            .where(eq(schema.subscriptions.id, subscriptionId));
          return new Response(JSON.stringify({ success: true, message: 'Subscription paused' }), {
            status: 200,
            headers,
          });
        }

        case 'reactivate': {
          await db
            .update(schema.subscriptions)
            .set({ status: 'active', cancelledAt: null, cancelAtPeriodEnd: false, updatedAt: now })
            .where(eq(schema.subscriptions.id, subscriptionId));
          return new Response(
            JSON.stringify({ success: true, message: 'Subscription reactivated' }),
            { status: 200, headers }
          );
        }

        case 'extend': {
          const days = data?.days || 30;
          const newEndDate = new Date(subscription.currentPeriodEnd);
          newEndDate.setDate(newEndDate.getDate() + days);

          await db
            .update(schema.subscriptions)
            .set({ currentPeriodEnd: newEndDate, updatedAt: now })
            .where(eq(schema.subscriptions.id, subscriptionId));

          return new Response(
            JSON.stringify({
              success: true,
              message: `Subscription extended by ${days} days`,
              newEndDate,
            }),
            { status: 200, headers }
          );
        }

        case 'change_plan': {
          const newPlanId = data?.planId;
          if (!newPlanId) {
            return new Response(JSON.stringify({ error: 'New plan ID required' }), {
              status: 400,
              headers,
            });
          }

          await db
            .update(schema.subscriptions)
            .set({ planId: newPlanId, updatedAt: now })
            .where(eq(schema.subscriptions.id, subscriptionId));

          return new Response(JSON.stringify({ success: true, message: 'Plan changed' }), {
            status: 200,
            headers,
          });
        }

        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers,
          });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
