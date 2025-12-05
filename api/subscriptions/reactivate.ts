import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    let userId: string;
    try {
      const authUser = await verifyAuth(req);
      userId = authUser.id;
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    // Get subscription that's scheduled for cancellation
    const [subscription] = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          eq(schema.subscriptions.cancelAtPeriodEnd, true),
          or(
            eq(schema.subscriptions.status, 'active'),
            eq(schema.subscriptions.status, 'pending_downgrade')
          )
        )
      )
      .limit(1);

    if (!subscription) {
      return new Response(JSON.stringify({ error: 'No subscription pending cancellation found' }), {
        status: 404,
        headers,
      });
    }

    // Check if still within period
    const now = new Date();
    if (new Date(subscription.currentPeriodEnd) < now) {
      return new Response(
        JSON.stringify({
          error: 'Subscription period has ended. Please create a new subscription.',
        }),
        { status: 400, headers }
      );
    }

    // Reactivate
    await db
      .update(schema.subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        status: 'active',
        updatedAt: now,
      })
      .where(eq(schema.subscriptions.id, subscription.id));

    // Record in payment history (table may not exist yet)
    try {
      await db.insert(schema.paymentHistory).values({
        userId,
        type: 'subscription',
        amount: '0',
        currency: subscription.currency || 'INR',
        status: 'completed',
        refId: subscription.id,
        refType: 'subscription',
        metadata: JSON.stringify({
          action: 'reactivate',
          planId: subscription.planId,
        }),
      });
    } catch (e) {
      console.warn('Payment history insert failed:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription reactivated! Your plan will continue as normal.',
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = { runtime: 'edge' };
