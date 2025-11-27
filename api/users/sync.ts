import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

// Input sanitization helper
function sanitizeString(str: string | null | undefined, maxLength: number = 255): string | null {
  if (!str) return null;
  // Remove any potential XSS vectors and limit length
  return str.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320;
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
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
    // Limit request body size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413,
        headers,
      });
    }

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

    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
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

    // Sanitize inputs
    const sanitizedName = sanitizeString(name, 100);
    const sanitizedAvatarUrl = sanitizeString(avatarUrl, 500);

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
          name: sanitizedName || existing[0].name,
          avatarUrl: sanitizedAvatarUrl || existing[0].avatarUrl,
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
          name: sanitizedName,
          avatarUrl: sanitizedAvatarUrl,
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
