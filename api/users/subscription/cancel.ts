import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
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
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
    const [subscription] = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, 'active'))
      )
      .limit(1);

    if (!subscription) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 404,
        headers,
      });
    }

    const [updated] = await db
      .update(schema.subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.id, subscription.id))
      .returning();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription cancelled. Access remains until period end.',
        subscription: updated,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = {
  runtime: 'edge',
};
