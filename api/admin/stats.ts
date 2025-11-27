import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, sql, count, sum, desc, and, gte, lte } from 'drizzle-orm';

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Basic counts
    const [podcastCount] = await db.select({ count: count() }).from(schema.podcasts);
    const [userCount] = await db.select({ count: count() }).from(schema.users);
    const [subCount] = await db.select({ count: count() }).from(schema.subscriptions).where(eq(schema.subscriptions.status, 'active'));
    const [merchCount] = await db.select({ count: count() }).from(schema.merchItems).where(eq(schema.merchItems.isActive, true));

    // Revenue calculations
    const [purchaseRevenue] = await db.select({ total: sum(schema.purchases.amount) })
      .from(schema.purchases).where(eq(schema.purchases.status, 'completed'));
    
    const [subscriptionRevenue] = await db.select({ total: sum(schema.subscriptions.amount) })
      .from(schema.subscriptions).where(eq(schema.subscriptions.status, 'active'));

    const [merchRevenue] = await db.select({ total: sum(schema.merchOrders.totalAmount) })
      .from(schema.merchOrders).where(eq(schema.merchOrders.status, 'paid'));

    // Last 30 days revenue
    const [recentPurchaseRevenue] = await db.select({ total: sum(schema.purchases.amount) })
      .from(schema.purchases)
      .where(and(eq(schema.purchases.status, 'completed'), gte(schema.purchases.createdAt, thirtyDaysAgo)));

    // New users this month
    const [newUsersThisMonth] = await db.select({ count: count() })
      .from(schema.users).where(gte(schema.users.createdAt, thirtyDaysAgo));

    // New subscriptions this month
    const [newSubsThisMonth] = await db.select({ count: count() })
      .from(schema.subscriptions).where(gte(schema.subscriptions.createdAt, thirtyDaysAgo));

    // Pending refunds
    const [pendingRefunds] = await db.select({ count: count() })
      .from(schema.refundRequests).where(eq(schema.refundRequests.status, 'pending'));

    // Revenue by day (last 7 days) for chart
    const revenueByDay: { date: string; day: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayRevenue] = await db.select({ total: sum(schema.purchases.amount) })
        .from(schema.purchases)
        .where(and(
          eq(schema.purchases.status, 'completed'),
          gte(schema.purchases.createdAt, dayStart),
          lte(schema.purchases.createdAt, dayEnd)
        ));

      revenueByDay.push({
        date: dayStart.toISOString().split('T')[0],
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: parseFloat(dayRevenue.total || '0'),
      });
    }

    // Subscription distribution by plan
    const planDistribution = await db.select({
      planId: schema.subscriptions.planId,
      planName: schema.pricingPlans.name,
      count: count(),
    })
      .from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(eq(schema.subscriptions.status, 'active'))
      .groupBy(schema.subscriptions.planId, schema.pricingPlans.name);

    // Top podcasts by purchases
    const topPodcasts = await db.select({
      id: schema.podcasts.id,
      title: schema.podcasts.title,
      thumbnailUrl: schema.podcasts.thumbnailUrl,
      purchaseCount: count(schema.purchases.id),
      revenue: sum(schema.purchases.amount),
    })
      .from(schema.podcasts)
      .leftJoin(schema.purchases, and(
        eq(schema.purchases.podcastId, schema.podcasts.id),
        eq(schema.purchases.status, 'completed')
      ))
      .groupBy(schema.podcasts.id, schema.podcasts.title, schema.podcasts.thumbnailUrl)
      .orderBy(desc(count(schema.purchases.id)))
      .limit(5);

    // Recent activity
    const recentPurchases = await db.select({
      id: schema.purchases.id,
      amount: schema.purchases.amount,
      createdAt: schema.purchases.createdAt,
      user: { name: schema.users.name, email: schema.users.email },
      podcast: { title: schema.podcasts.title },
    })
      .from(schema.purchases)
      .leftJoin(schema.users, eq(schema.purchases.userId, schema.users.id))
      .leftJoin(schema.podcasts, eq(schema.purchases.podcastId, schema.podcasts.id))
      .where(eq(schema.purchases.status, 'completed'))
      .orderBy(desc(schema.purchases.createdAt))
      .limit(10);

    const recentSubscriptions = await db.select({
      id: schema.subscriptions.id,
      createdAt: schema.subscriptions.createdAt,
      user: { name: schema.users.name, email: schema.users.email },
      plan: { name: schema.pricingPlans.name, price: schema.pricingPlans.price },
    })
      .from(schema.subscriptions)
      .leftJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
      .leftJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(10);

    const recentUsers = await db.select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(10);

    const totalRevenue = 
      parseFloat(purchaseRevenue.total || '0') + 
      parseFloat(subscriptionRevenue.total || '0') +
      parseFloat(merchRevenue.total || '0');

    return new Response(JSON.stringify({
      stats: {
        totalPodcasts: podcastCount.count,
        totalUsers: userCount.count,
        activeSubscriptions: subCount.count,
        totalProducts: merchCount.count,
        totalRevenue,
        monthlyRevenue: parseFloat(recentPurchaseRevenue.total || '0'),
        newUsersThisMonth: newUsersThisMonth.count,
        newSubsThisMonth: newSubsThisMonth.count,
        pendingRefunds: pendingRefunds.count,
      },
      charts: {
        revenueByDay,
        planDistribution,
        topPodcasts,
      },
      recentPurchases,
      recentSubscriptions,
      recentUsers,
    }), { status: 200, headers });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
