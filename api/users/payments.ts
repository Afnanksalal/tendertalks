import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, desc } from 'drizzle-orm';

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

  try {
    // Get payment history
    const payments = await db.select()
      .from(schema.paymentHistory)
      .where(eq(schema.paymentHistory.userId, userId))
      .orderBy(desc(schema.paymentHistory.createdAt))
      .limit(50);

    // Get refund requests
    const refunds = await db.select()
      .from(schema.refundRequests)
      .where(eq(schema.refundRequests.userId, userId))
      .orderBy(desc(schema.refundRequests.createdAt));

    return new Response(JSON.stringify({ payments, refunds }), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
