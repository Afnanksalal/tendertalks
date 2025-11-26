import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, sql, count, sum, desc, and, gte } from 'drizzle-orm';

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

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  // Verify admin
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  try {
    // Get total podcasts
    const [podcastCount] = await db
      .select({ count: count() })
      .from(schema.podcasts);

    // Get total users
    const [userCount] = await db
      .select({ count: count() })
      .from(schema.users);

    // Get active subscriptions
    const [subCount] = await db
      .select({ count: count() })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.status, 'active'));

    // Get total revenue from purchases
    const [purchaseRevenue] = await db
      .select({ total: sum(schema.purchases.amount) })
      .from(schema.purchases)
      .where(eq(schema.purchases.status, 'completed'));

    // Get total revenue from merch
    const [merchRevenue] = await db
      .select({ total: sum(schema.merchOrders.totalAmount) })
      .from(schema.merchOrders)
      .where(eq(schema.merchOrders.status, 'paid'));

    // Recent activity - last 10 purchases
    const recentPurchases = await db
      .select({
        id: schema.purchases.id,
        amount: schema.purchases.amount,
        createdAt: schema.purchases.createdAt,
        user: {
          name: schema.users.name,
          email: schema.users.email,
        },
        podcast: {
          title: schema.podcasts.title,
        },
      })
      .from(schema.purchases)
      .leftJoin(schema.users, eq(schema.purchases.userId, schema.users.id))
      .leftJoin(schema.podcasts, eq(schema.purchases.podcastId, schema.podcasts.id))
      .where(eq(schema.purchases.status, 'completed'))
      .orderBy(desc(schema.purchases.createdAt))
      .limit(10);

    // Recent subscriptions
    const recentSubscriptions = await db
      .select({
        id: schema.subscriptions.id,
        createdAt: schema.subscriptions.createdAt,
        user: {
          name: schema.users.name,
          email: schema.users.email,
        },
        plan: {
          name: schema.pricingPlans.name,
          price: schema.pricingPlans.price,
        },
      })
      .from(schema.subscriptions)
      .leftJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
      .leftJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(10);

    // Recent users
    const recentUsers = await db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(10);

    const totalRevenue = 
      parseFloat(purchaseRevenue.total || '0') + 
      parseFloat(merchRevenue.total || '0');

    return new Response(JSON.stringify({
      stats: {
        totalPodcasts: podcastCount.count,
        totalUsers: userCount.count,
        activeSubscriptions: subCount.count,
        totalRevenue,
      },
      recentPurchases,
      recentSubscriptions,
      recentUsers,
    }), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = {
  runtime: 'edge',
};
