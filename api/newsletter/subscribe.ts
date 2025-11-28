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
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
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
    // Check if newsletter feature is enabled
    const [newsletterSetting] = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, 'feature_newsletter'))
      .limit(1);
    
    if (newsletterSetting && newsletterSetting.value === 'false') {
      return new Response(JSON.stringify({ error: 'Newsletter is currently disabled' }), {
        status: 403,
        headers,
      });
    }

    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers,
      });
    }

    const existing = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].unsubscribedAt) {
        await db
          .update(schema.newsletterSubscribers)
          .set({ unsubscribedAt: null, subscribedAt: new Date() })
          .where(eq(schema.newsletterSubscribers.email, email.toLowerCase()));
      }
      return new Response(JSON.stringify({ success: true, message: 'Subscribed!' }), {
        status: 200,
        headers,
      });
    }

    await db.insert(schema.newsletterSubscribers).values({
      email: email.toLowerCase(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
