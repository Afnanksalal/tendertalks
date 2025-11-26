import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { id, email, name, avatarUrl } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers,
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers,
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return new Response(JSON.stringify({ error: 'Invalid user ID format' }), {
        status: 400,
        headers,
      });
    }

    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    let user: schema.User;

    if (existing.length > 0) {
      const [updated] = await db
        .update(schema.users)
        .set({
          email,
          name: name || existing[0].name,
          avatarUrl: avatarUrl || existing[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();

      user = updated;
    } else {
      const [newUser] = await db
        .insert(schema.users)
        .values({
          id,
          email,
          name: name || null,
          avatarUrl: avatarUrl || null,
          role: 'user',
        })
        .returning();

      user = newUser;
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { status: 409, headers }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
