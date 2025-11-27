import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, sql, count, sum, desc, and, gte, lte, ne, avg } from 'drizzle-orm';

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
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Basic counts
    const [podcastCount] = await db.select({ count: count() }).from(schema.podcasts);
    const [publishedPodcastCount] = await db.select({ count: count() }).from(schema.podcasts).where(eq(schema.podcasts.status, 'published'));
    const [userCount] = await db.select({ count: count() }).from(schema.users);
    const [subCount] = await db.select({ count: count() }).from(schema.subscriptions).where(eq(schema.subscriptions.status, 'active'));
    const [merchCount] = await db.select({ count: count() }).from(schema.merchItems).where(eq(schema.merchItems.isActive, true));
    const [categoryCount] = await db.select({ count: count() }).from(schema.categories);

    // Total views across all podcasts
    const [totalViews] = await db.select({ total: sum(schema.podcasts.viewCount) }).from(schema.podcasts);

    // Total plays from play history
    const [totalPlays] = await db.select({ count: count() }).from(schema.playHistory);
    const [completedPlays] = await db.select({ count: count() }).from(schema.playHistory).where(eq(schema.playHistory.completed, true));

    // Total downloads
    const [totalDownloads] = await db.select({ count: count() }).from(schema.downloads);

    // Revenue calculations - All time
    const [purchaseRevenue] = await db.select({ total: sum(schema.purchases.amount), count: count() })
      .from(schema.purchases).where(eq(schema.purchases.status, 'completed'));
    
    const [subscriptionRevenue] = await db.select({ total: sum(schema.subscriptions.amount) })
      .from(schema.subscriptions).where(eq(schema.subscriptions.status, 'active'));

    const [merchRevenue] = await db.select({ total: sum(schema.merchOrders.totalAmount), count: count() })
      .from(schema.merchOrders).where(eq(schema.merchOrders.status, 'paid'));

    // Last 30 days revenue (purchases + subscriptions + merch)
    const [recentPurchaseRevenue] = await db.select({ total: sum(schema.purchases.amount), count: count() })
      .from(schema.purchases)
      .where(and(eq(schema.purchases.status, 'completed'), gte(schema.purchases.createdAt, thirtyDaysAgo)));

    const [recentSubRevenue] = await db.select({ total: sum(schema.subscriptions.amount), count: count() })
      .from(schema.subscriptions)
      .where(gte(schema.subscriptions.createdAt, thirtyDaysAgo));

    const [recentMerchRevenue] = await db.select({ total: sum(schema.merchOrders.totalAmount), count: count() })
      .from(schema.merchOrders)
      .where(and(eq(schema.merchOrders.status, 'paid'), gte(schema.merchOrders.createdAt, thirtyDaysAgo)));

    // Previous 30 days for comparison (30-60 days ago)
    const [prevPurchaseRevenue] = await db.select({ total: sum(schema.purchases.amount) })
      .from(schema.purchases)
      .where(and(
        eq(schema.purchases.status, 'completed'),
        gte(schema.purchases.createdAt, sixtyDaysAgo),
        lte(schema.purchases.createdAt, thirtyDaysAgo)
      ));

    // New users this month vs last month
    const [newUsersThisMonth] = await db.select({ count: count() })
      .from(schema.users).where(gte(schema.users.createdAt, thirtyDaysAgo));
    
    const [newUsersPrevMonth] = await db.select({ count: count() })
      .from(schema.users).where(and(gte(schema.users.createdAt, sixtyDaysAgo), lte(schema.users.createdAt, thirtyDaysAgo)));

    // New subscriptions this month
    const [newSubsThisMonth] = await db.select({ count: count() })
      .from(schema.subscriptions).where(gte(schema.subscriptions.createdAt, thirtyDaysAgo));

    // Cancelled subscriptions
    const [cancelledSubs] = await db.select({ count: count() })
      .from(schema.subscriptions).where(eq(schema.subscriptions.status, 'cancelled'));

    // Pending refunds
    const [pendingRefunds] = await db.select({ count: count() })
      .from(schema.refundRequests).where(eq(schema.refundRequests.status, 'pending'));

    // Total refunded amount
    const [refundedAmount] = await db.select({ total: sum(schema.refundRequests.amount) })
      .from(schema.refundRequests).where(eq(schema.refundRequests.status, 'processed'));

    // Newsletter subscribers
    const [newsletterCount] = await db.select({ count: count() })
      .from(schema.newsletterSubscribers).where(sql`${schema.newsletterSubscribers.unsubscribedAt} IS NULL`);

    // Average order value
    const avgPurchaseValue = purchaseRevenue.count > 0 
      ? parseFloat(purchaseRevenue.total || '0') / Number(purchaseRevenue.count) 
      : 0;

    // Revenue by day (last 7 days) for chart - includes all revenue sources
    const revenueByDay: { date: string; day: string; revenue: number; purchases: number; subscriptions: number; merch: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayPurchases] = await db.select({ total: sum(schema.purchases.amount) })
        .from(schema.purchases)
        .where(and(
          eq(schema.purchases.status, 'completed'),
          gte(schema.purchases.createdAt, dayStart),
          lte(schema.purchases.createdAt, dayEnd)
        ));

      const [daySubs] = await db.select({ total: sum(schema.subscriptions.amount) })
        .from(schema.subscriptions)
        .where(and(
          gte(schema.subscriptions.createdAt, dayStart),
          lte(schema.subscriptions.createdAt, dayEnd)
        ));

      const [dayMerch] = await db.select({ total: sum(schema.merchOrders.totalAmount) })
        .from(schema.merchOrders)
        .where(and(
          eq(schema.merchOrders.status, 'paid'),
          gte(schema.merchOrders.createdAt, dayStart),
          lte(schema.merchOrders.createdAt, dayEnd)
        ));

      const purchaseAmt = parseFloat(dayPurchases.total || '0');
      const subAmt = parseFloat(daySubs.total || '0');
      const merchAmt = parseFloat(dayMerch.total || '0');

      revenueByDay.push({
        date: dayStart.toISOString().split('T')[0],
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: purchaseAmt + subAmt + merchAmt,
        purchases: purchaseAmt,
        subscriptions: subAmt,
        merch: merchAmt,
      });
    }

    // Users by day (last 7 days)
    const usersByDay: { date: string; day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayUsers] = await db.select({ count: count() })
        .from(schema.users)
        .where(and(gte(schema.users.createdAt, dayStart), lte(schema.users.createdAt, dayEnd)));

      usersByDay.push({
        date: dayStart.toISOString().split('T')[0],
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        count: Number(dayUsers.count),
      });
    }

    // Subscription distribution by plan
    const planDistribution = await db.select({
      planId: schema.subscriptions.planId,
      planName: schema.pricingPlans.name,
      planPrice: schema.pricingPlans.price,
      count: count(),
    })
      .from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(eq(schema.subscriptions.status, 'active'))
      .groupBy(schema.subscriptions.planId, schema.pricingPlans.name, schema.pricingPlans.price);

    // Top podcasts by revenue AND views
    const topPodcasts = await db.select({
      id: schema.podcasts.id,
      title: schema.podcasts.title,
      slug: schema.podcasts.slug,
      thumbnailUrl: schema.podcasts.thumbnailUrl,
      viewCount: schema.podcasts.viewCount,
      isFree: schema.podcasts.isFree,
      price: schema.podcasts.price,
      purchaseCount: count(schema.purchases.id),
      revenue: sum(schema.purchases.amount),
    })
      .from(schema.podcasts)
      .leftJoin(schema.purchases, and(
        eq(schema.purchases.podcastId, schema.podcasts.id),
        eq(schema.purchases.status, 'completed')
      ))
      .where(eq(schema.podcasts.status, 'published'))
      .groupBy(schema.podcasts.id, schema.podcasts.title, schema.podcasts.slug, schema.podcasts.thumbnailUrl, schema.podcasts.viewCount, schema.podcasts.isFree, schema.podcasts.price)
      .orderBy(desc(sum(schema.purchases.amount)), desc(schema.podcasts.viewCount))
      .limit(10);

    // Top podcasts by views only
    const topByViews = await db.select({
      id: schema.podcasts.id,
      title: schema.podcasts.title,
      thumbnailUrl: schema.podcasts.thumbnailUrl,
      viewCount: schema.podcasts.viewCount,
    })
      .from(schema.podcasts)
      .where(eq(schema.podcasts.status, 'published'))
      .orderBy(desc(schema.podcasts.viewCount))
      .limit(5);

    // Most played podcasts
    const mostPlayed = await db.select({
      podcastId: schema.playHistory.podcastId,
      title: schema.podcasts.title,
      thumbnailUrl: schema.podcasts.thumbnailUrl,
      playCount: count(),
      completionRate: sql<number>`ROUND(AVG(CASE WHEN ${schema.playHistory.completed} THEN 100 ELSE 0 END))`,
    })
      .from(schema.playHistory)
      .innerJoin(schema.podcasts, eq(schema.playHistory.podcastId, schema.podcasts.id))
      .groupBy(schema.playHistory.podcastId, schema.podcasts.title, schema.podcasts.thumbnailUrl)
      .orderBy(desc(count()))
      .limit(5);

    // Revenue by category
    const revenueByCategory = await db.select({
      categoryId: schema.categories.id,
      categoryName: schema.categories.name,
      revenue: sum(schema.purchases.amount),
      count: count(schema.purchases.id),
    })
      .from(schema.purchases)
      .innerJoin(schema.podcasts, eq(schema.purchases.podcastId, schema.podcasts.id))
      .innerJoin(schema.categories, eq(schema.podcasts.categoryId, schema.categories.id))
      .where(eq(schema.purchases.status, 'completed'))
      .groupBy(schema.categories.id, schema.categories.name);

    // Recent activity
    const recentPurchases = await db.select({
      id: schema.purchases.id,
      amount: schema.purchases.amount,
      status: schema.purchases.status,
      createdAt: schema.purchases.createdAt,
      user: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
      podcast: { id: schema.podcasts.id, title: schema.podcasts.title, slug: schema.podcasts.slug },
    })
      .from(schema.purchases)
      .leftJoin(schema.users, eq(schema.purchases.userId, schema.users.id))
      .leftJoin(schema.podcasts, eq(schema.purchases.podcastId, schema.podcasts.id))
      .where(eq(schema.purchases.status, 'completed'))
      .orderBy(desc(schema.purchases.createdAt))
      .limit(10);

    const recentSubscriptions = await db.select({
      id: schema.subscriptions.id,
      status: schema.subscriptions.status,
      amount: schema.subscriptions.amount,
      createdAt: schema.subscriptions.createdAt,
      currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
      user: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
      plan: { id: schema.pricingPlans.id, name: schema.pricingPlans.name, price: schema.pricingPlans.price },
    })
      .from(schema.subscriptions)
      .leftJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
      .leftJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(10);

    const recentUsers = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      avatarUrl: schema.users.avatarUrl,
      createdAt: schema.users.createdAt,
    })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(10);

    // Merch stats
    const topMerch = await db.select({
      id: schema.merchItems.id,
      name: schema.merchItems.name,
      imageUrl: schema.merchItems.imageUrl,
      price: schema.merchItems.price,
      stockQuantity: schema.merchItems.stockQuantity,
      soldCount: count(schema.merchOrderItems.id),
      revenue: sum(schema.merchOrderItems.priceAtPurchase),
    })
      .from(schema.merchItems)
      .leftJoin(schema.merchOrderItems, eq(schema.merchOrderItems.merchItemId, schema.merchItems.id))
      .groupBy(schema.merchItems.id, schema.merchItems.name, schema.merchItems.imageUrl, schema.merchItems.price, schema.merchItems.stockQuantity)
      .orderBy(desc(count(schema.merchOrderItems.id)))
      .limit(5);

    // Calculate totals
    const totalRevenue = 
      parseFloat(purchaseRevenue.total || '0') + 
      parseFloat(subscriptionRevenue.total || '0') +
      parseFloat(merchRevenue.total || '0');

    const monthlyRevenue = 
      parseFloat(recentPurchaseRevenue.total || '0') + 
      parseFloat(recentSubRevenue.total || '0') +
      parseFloat(recentMerchRevenue.total || '0');

    const prevMonthRevenue = parseFloat(prevPurchaseRevenue.total || '0');
    const revenueGrowth = prevMonthRevenue > 0 
      ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)
      : monthlyRevenue > 0 ? '100' : '0';

    const userGrowth = Number(newUsersPrevMonth.count) > 0
      ? ((Number(newUsersThisMonth.count) - Number(newUsersPrevMonth.count)) / Number(newUsersPrevMonth.count) * 100).toFixed(1)
      : Number(newUsersThisMonth.count) > 0 ? '100' : '0';

    // Conversion rate (users who made a purchase / total users)
    const [usersWithPurchases] = await db.select({ count: sql<number>`COUNT(DISTINCT ${schema.purchases.userId})` })
      .from(schema.purchases).where(eq(schema.purchases.status, 'completed'));
    const conversionRate = Number(userCount.count) > 0 
      ? (Number(usersWithPurchases.count) / Number(userCount.count) * 100).toFixed(1)
      : '0';

    // Churn rate (cancelled / total subscriptions ever)
    const [totalSubsEver] = await db.select({ count: count() }).from(schema.subscriptions);
    const churnRate = Number(totalSubsEver.count) > 0
      ? (Number(cancelledSubs.count) / Number(totalSubsEver.count) * 100).toFixed(1)
      : '0';

    return new Response(JSON.stringify({
      stats: {
        totalPodcasts: podcastCount.count,
        publishedPodcasts: publishedPodcastCount.count,
        totalUsers: userCount.count,
        activeSubscriptions: subCount.count,
        cancelledSubscriptions: cancelledSubs.count,
        totalProducts: merchCount.count,
        totalCategories: categoryCount.count,
        totalRevenue,
        monthlyRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        purchaseRevenue: parseFloat(purchaseRevenue.total || '0'),
        subscriptionRevenue: parseFloat(subscriptionRevenue.total || '0'),
        merchRevenue: parseFloat(merchRevenue.total || '0'),
        newUsersThisMonth: newUsersThisMonth.count,
        userGrowth: parseFloat(userGrowth),
        newSubsThisMonth: newSubsThisMonth.count,
        pendingRefunds: pendingRefunds.count,
        totalRefunded: parseFloat(refundedAmount.total || '0'),
        totalViews: Number(totalViews.total || 0),
        totalPlays: totalPlays.count,
        completedPlays: completedPlays.count,
        totalDownloads: totalDownloads.count,
        newsletterSubscribers: newsletterCount.count,
        avgOrderValue: Math.round(avgPurchaseValue * 100) / 100,
        conversionRate: parseFloat(conversionRate),
        churnRate: parseFloat(churnRate),
      },
      charts: {
        revenueByDay,
        usersByDay,
        planDistribution,
        revenueByCategory,
        topPodcasts,
        topByViews,
        mostPlayed,
        topMerch,
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
