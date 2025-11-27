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
    return new Response(JSON.stringify({ error: 'Category ID required' }), { status: 400, headers });
  }

  try {
    if (req.method === 'PUT') {
      const body = await req.json();
      const { name, description } = body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) {
        updateData.name = name;
        updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (description !== undefined) updateData.description = description;

      const [category] = await db.update(schema.categories)
        .set(updateData)
        .where(eq(schema.categories.id, id))
        .returning();

      if (!category) {
        return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify(category), { status: 200, headers });
    }

    if (req.method === 'DELETE') {
      // Check if category has podcasts
      const [podcast] = await db.select()
        .from(schema.podcasts)
        .where(eq(schema.podcasts.categoryId, id))
        .limit(1);

      if (podcast) {
        return new Response(JSON.stringify({ error: 'Cannot delete category with podcasts' }), { status: 400, headers });
      }

      await db.delete(schema.categories).where(eq(schema.categories.id, id));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin category error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
