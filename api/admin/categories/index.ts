import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { asc } from 'drizzle-orm';
import { verifyAuth } from '../../utils/auth';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const user = await verifyAuth(req);
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers,
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    if (req.method === 'GET') {
      const categories = await db
        .select()
        .from(schema.categories)
        .orderBy(asc(schema.categories.name));
      return new Response(JSON.stringify(categories), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, description } = body;

      if (!name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers,
        });
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [category] = await db
        .insert(schema.categories)
        .values({
          name,
          slug,
          description: description || '',
        })
        .returning();

      return new Response(JSON.stringify(category), { status: 201, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Admin categories error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };
