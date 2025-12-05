import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '../utils/auth';

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

  let userId: string;
  try {
    const user = await verifyAuth(req);
    userId = user.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  if (req.method === 'GET') {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers,
        });
      }

      return new Response(JSON.stringify(user), { status: 200, headers });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = await req.json();
      const { name, avatarUrl } = body;

      const updateData: Partial<schema.User> = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      const [updated] = await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, userId))
        .returning();

      return new Response(JSON.stringify(updated), { status: 200, headers });
    } catch (error) {
      console.error('Error updating profile:', error);
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
