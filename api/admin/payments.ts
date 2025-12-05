import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  let userId: string;
  try {
    const authUser = await verifyAuth(req);
    userId = authUser.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Get purchases
    const purchases = await db
      .select({
        id: schema.purchases.id,
        type: sql<string>`'purchase'`,
        amount: schema.purchases.amount,
        currency: schema.purchases.currency,
        status: schema.purchases.status,
        createdAt: schema.purchases.createdAt,
        razorpayPaymentId: schema.purchases.razorpayPaymentId,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        },
        podcast: {
          id: schema.podcasts.id,
          title: schema.podcasts.title,
        },
      })
      .from(schema.purchases)
      .leftJoin(schema.users, eq(schema.purchases.userId, schema.users.id))
      .leftJoin(schema.podcasts, eq(schema.purchases.podcastId, schema.podcasts.id))
      .orderBy(desc(schema.purchases.createdAt))
      .limit(limit);

    // Get subscriptions
    const subscriptions = await db
      .select({
        id: schema.subscriptions.id,
        type: sql<string>`'subscription'`,
        status: schema.subscriptions.status,
        createdAt: schema.subscriptions.createdAt,
        currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
        razorpayPaymentId: schema.subscriptions.razorpayPaymentId,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        },
        plan: {
          id: schema.pricingPlans.id,
          name: schema.pricingPlans.name,
          price: schema.pricingPlans.price,
        },
      })
      .from(schema.subscriptions)
      .leftJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
      .leftJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(limit);

    // Get merch orders
    const merchOrders = await db
      .select({
        id: schema.merchOrders.id,
        type: sql<string>`'merch'`,
        amount: schema.merchOrders.totalAmount,
        currency: schema.merchOrders.currency,
        status: schema.merchOrders.status,
        createdAt: schema.merchOrders.createdAt,
        razorpayPaymentId: schema.merchOrders.razorpayPaymentId,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        },
      })
      .from(schema.merchOrders)
      .leftJoin(schema.users, eq(schema.merchOrders.userId, schema.users.id))
      .orderBy(desc(schema.merchOrders.createdAt))
      .limit(limit);

    let result;
    if (type === 'purchases') {
      result = purchases;
    } else if (type === 'subscriptions') {
      result = subscriptions;
    } else if (type === 'merch') {
      result = merchOrders;
    } else {
      // Combine and sort by date
      result = [
        ...purchases,
        ...subscriptions.map((s) => ({
          ...s,
          amount: s.plan?.price || '0',
          currency: 'INR',
        })),
        ...merchOrders,
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    }

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = {
  runtime: 'edge',
};
