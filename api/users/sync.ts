import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

    if (!id || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers,
      });
    }

    // Check if user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    let user;

    if (existing.length > 0) {
      // Update existing user
      const [updated] = await db
        .update(users)
        .set({
          email,
          name: name || existing[0].name,
          avatarUrl: avatarUrl || existing[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      user = updated;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          id,
          email,
          name,
          avatarUrl,
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
