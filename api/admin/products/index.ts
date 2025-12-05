import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, desc } from 'drizzle-orm';
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  let userId: string;
  try {
    const user = await verifyAuth(req);
    userId = user.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  if (!(await verifyAdmin(userId))) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const includeInactive = url.searchParams.get('includeInactive') === 'true';

      const items = includeInactive
        ? await db.select().from(schema.merchItems).orderBy(desc(schema.merchItems.createdAt))
        : await db
            .select()
            .from(schema.merchItems)
            .where(eq(schema.merchItems.isActive, true))
            .orderBy(desc(schema.merchItems.createdAt));

      return new Response(JSON.stringify(items), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, description, price, category, imageUrl, stockQuantity, inStock, isActive } =
        body;

      if (!name || !price) {
        return new Response(JSON.stringify({ error: 'Name and price are required' }), {
          status: 400,
          headers,
        });
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [item] = await db
        .insert(schema.merchItems)
        .values({
          name,
          slug,
          description: description || '',
          price: price.toString(),
          category: category || 'accessories',
          imageUrl: imageUrl || null,
          stockQuantity: stockQuantity || 0,
          inStock: inStock !== false,
          isActive: isActive !== false,
        })
        .returning();

      return new Response(JSON.stringify(item), { status: 201, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin products error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
