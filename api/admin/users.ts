import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  const [admin] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!admin || admin.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  const url = new URL(req.url);

  if (req.method === 'GET') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const search = url.searchParams.get('search');

      let query = db.select().from(schema.users);

      if (search) {
        query = query.where(
          sql`${schema.users.email} ILIKE ${`%${search}%`} OR ${schema.users.name} ILIKE ${`%${search}%`}`
        ) as any;
      }

      const users = await query
        .orderBy(desc(schema.users.createdAt))
        .limit(limit)
        .offset(offset);

      return new Response(JSON.stringify(users), { status: 200, headers });
    } catch (error) {
      console.error('Error fetching users:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = await req.json();
      const { targetUserId, role } = body;

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), {
          status: 400,
          headers,
        });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (role !== undefined) updateData.role = role;

      const [updated] = await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, targetUserId))
        .returning();

      return new Response(JSON.stringify(updated), { status: 200, headers });
    } catch (error) {
      console.error('Error updating user:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers,
  });
}

export const config = {
  runtime: 'edge',
};
