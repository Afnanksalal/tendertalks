import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

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
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const userId = req.headers.get('x-user-id');
  if (!userId || !(await verifyAdmin(userId))) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers });
  }

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return new Response(JSON.stringify({ error: 'Product ID required' }), { status: 400, headers });
  }

  try {
    if (req.method === 'GET') {
      const [item] = await db.select().from(schema.merchItems).where(eq(schema.merchItems.id, id)).limit(1);
      if (!item) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify(item), { status: 200, headers });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { name, description, price, category, imageUrl, stockQuantity, inStock, isActive } = body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) {
        updateData.name = name;
        updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price.toString();
      if (category !== undefined) updateData.category = category;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (stockQuantity !== undefined) updateData.stockQuantity = stockQuantity;
      if (inStock !== undefined) updateData.inStock = inStock;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [item] = await db.update(schema.merchItems)
        .set(updateData)
        .where(eq(schema.merchItems.id, id))
        .returning();

      if (!item) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify(item), { status: 200, headers });
    }

    if (req.method === 'DELETE') {
      // Soft delete - just mark as inactive
      const [item] = await db.update(schema.merchItems)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.merchItems.id, id))
        .returning();

      if (!item) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin product error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
