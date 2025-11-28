import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

// Default settings if table doesn't exist or is empty
const defaultSettings: Record<string, string> = {
  feature_blog: 'true',
  feature_merch: 'true',
  feature_subscriptions: 'true',
  feature_downloads: 'true',
  feature_newsletter: 'true',
  site_name: 'TenderTalks',
  site_tagline: 'AI, Tech & Human Connection',
  maintenance_mode: 'false',
};

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const settings = await db.select().from(schema.siteSettings);

    // Convert to simple key-value object
    const settingsObj = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, { ...defaultSettings } as Record<string, string>);

    return new Response(JSON.stringify(settingsObj), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return defaults if table doesn't exist yet
    return new Response(JSON.stringify(defaultSettings), { status: 200, headers });
  }
}

export const config = { runtime: 'edge' };
