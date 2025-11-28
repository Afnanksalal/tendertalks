import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
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

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path is /api/admin/blogs/{id}/publish - get the second to last part
  const id = pathParts[pathParts.length - 2];

  if (!id || id === 'blogs' || id === 'admin') {
    return new Response(JSON.stringify({ error: 'Blog ID required' }), { status: 400, headers });
  }

  try {
    const [existing] = await db.select().from(schema.blogs).where(eq(schema.blogs.id, id)).limit(1);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Blog not found' }), { status: 404, headers });
    }

    const [blog] = await db
      .update(schema.blogs)
      .set({
        status: 'published',
        publishedAt: existing.publishedAt || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.blogs.id, id))
      .returning();

    return new Response(JSON.stringify(blog), { status: 200, headers });
  } catch (error) {
    console.error('Error publishing blog:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}

export const config = {
  runtime: 'edge',
};
