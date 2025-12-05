import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, asc } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

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
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const includeInactive = url.searchParams.get('includeInactive') === 'true';

      const plans = includeInactive
        ? await db.select().from(schema.pricingPlans).orderBy(asc(schema.pricingPlans.sortOrder))
        : await db
            .select()
            .from(schema.pricingPlans)
            .where(eq(schema.pricingPlans.isActive, true))
            .orderBy(asc(schema.pricingPlans.sortOrder));

      return new Response(JSON.stringify(plans), { status: 200, headers });
    }

    if (req.method === 'POST') {
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

      if (!name || price === undefined) {
        return new Response(JSON.stringify({ error: 'Name and price are required' }), {
          status: 400,
          headers,
        });
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [plan] = await db
        .insert(schema.pricingPlans)
        .values({
          name,
          slug,
          description: description || '',
          price: price.toString(),
          currency: currency || 'INR',
          interval: interval || 'month',
          features: features || [],
          allowDownloads: allowDownloads || false,
          allowOffline: allowOffline || false,
          sortOrder: sortOrder || 0,
          isActive: isActive !== false,
        })
        .returning();

      return new Response(JSON.stringify(plan), { status: 201, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin plans error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
