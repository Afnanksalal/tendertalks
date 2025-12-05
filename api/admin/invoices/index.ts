import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

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
    const status = url.searchParams.get('status') || 'all';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [];
    if (type !== 'all') {
      conditions.push(eq(schema.paymentHistory.type, type));
    }
    if (status !== 'all') {
      conditions.push(eq(schema.paymentHistory.status, status));
    }
    if (startDate) {
      conditions.push(gte(schema.paymentHistory.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(schema.paymentHistory.createdAt, new Date(endDate)));
    }

    const payments = await db
      .select({
        id: schema.paymentHistory.id,
        type: schema.paymentHistory.type,
        amount: schema.paymentHistory.amount,
        currency: schema.paymentHistory.currency,
        status: schema.paymentHistory.status,
        razorpayOrderId: schema.paymentHistory.razorpayOrderId,
        razorpayPaymentId: schema.paymentHistory.razorpayPaymentId,
        refId: schema.paymentHistory.refId,
        refType: schema.paymentHistory.refType,
        metadata: schema.paymentHistory.metadata,
        createdAt: schema.paymentHistory.createdAt,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        },
      })
      .from(schema.paymentHistory)
      .leftJoin(schema.users, eq(schema.paymentHistory.userId, schema.users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.paymentHistory.createdAt))
      .limit(limit);

    // Calculate summary stats
    const [stats] = await db
      .select({
        totalAmount: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
        totalCount: sql<number>`COUNT(*)`,
        completedCount: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        refundedCount: sql<number>`SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END)`,
        failedCount: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      })
      .from(schema.paymentHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return new Response(
      JSON.stringify({
        payments,
        stats: {
          totalAmount: parseFloat(stats.totalAmount || '0'),
          totalCount: stats.totalCount || 0,
          completedCount: stats.completedCount || 0,
          refundedCount: stats.refundedCount || 0,
          failedCount: stats.failedCount || 0,
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
