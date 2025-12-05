import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';
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
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  let userId: string;
  try {
    const authUser = await verifyAuth(req);
    userId = authUser.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  if (!(await verifyAdmin(userId))) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return new Response(JSON.stringify({ error: 'Plan ID required' }), { status: 400, headers });
  }

  try {
    if (req.method === 'GET') {
      const [plan] = await db
        .select()
        .from(schema.pricingPlans)
        .where(eq(schema.pricingPlans.id, id))
        .limit(1);
      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify(plan), { status: 200, headers });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const {
        name,
        description,
        price,
        currency,
        interval,
        features,
        allowDownloads,
        allowOffline,
        sortOrder,
        isActive,
      } = body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) {
        updateData.name = name;
        updateData.slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price.toString();
      if (currency !== undefined) updateData.currency = currency;
      if (interval !== undefined) updateData.interval = interval;
      if (features !== undefined) updateData.features = features;
      if (allowDownloads !== undefined) updateData.allowDownloads = allowDownloads;
      if (allowOffline !== undefined) updateData.allowOffline = allowOffline;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [plan] = await db
        .update(schema.pricingPlans)
        .set(updateData)
        .where(eq(schema.pricingPlans.id, id))
        .returning();

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify(plan), { status: 200, headers });
    }

    if (req.method === 'DELETE') {
      // Check if plan has active subscriptions
      const [activeSub] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.planId, id))
        .limit(1);

      if (activeSub) {
        // Soft delete - just mark as inactive
        const [plan] = await db
          .update(schema.pricingPlans)
          .set({ isActive: false })
          .where(eq(schema.pricingPlans.id, id))
          .returning();

        return new Response(JSON.stringify({ success: true, softDeleted: true, plan }), {
          status: 200,
          headers,
        });
      }

      // Hard delete if no subscriptions
      await db.delete(schema.pricingPlans).where(eq(schema.pricingPlans.id, id));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin plan error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
