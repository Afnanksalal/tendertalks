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
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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

  try {
    if (req.method === 'GET') {
      // Admin can see all settings with descriptions
      if (userId && (await verifyAdmin(userId))) {
        const settings = await db.select().from(schema.siteSettings);
        const settingsObj = settings.reduce(
          (acc, s) => {
            acc[s.key] = { value: s.value, description: s.description };
            return acc;
          },
          {} as Record<string, { value: string; description: string | null }>
        );
        return new Response(JSON.stringify(settingsObj), { status: 200, headers });
      }
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers,
      });
    }

    if (req.method === 'PUT') {
      if (!userId || !(await verifyAdmin(userId))) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers,
        });
      }

      const body = await req.json();
      const { key, value } = body;

      if (!key || value === undefined) {
        return new Response(JSON.stringify({ error: 'Key and value required' }), {
          status: 400,
          headers,
        });
      }

      // Check if setting exists
      const [existing] = await db
        .select()
        .from(schema.siteSettings)
        .where(eq(schema.siteSettings.key, key));

      if (existing) {
        await db
          .update(schema.siteSettings)
          .set({ value: String(value), updatedAt: new Date(), updatedBy: userId })
          .where(eq(schema.siteSettings.key, key));
      } else {
        await db.insert(schema.siteSettings).values({
          key,
          value: String(value),
          updatedBy: userId,
        });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin settings error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
