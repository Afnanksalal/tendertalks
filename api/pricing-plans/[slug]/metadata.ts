import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Path: /api/pricing-plans/[slug]/metadata -> slug is second to last
    const slug = pathParts[pathParts.length - 2];

    if (!slug || slug === 'metadata') {
      return new Response(JSON.stringify({ error: 'Slug required' }), {
        status: 400,
        headers,
      });
    }

    const plan = await db.query.pricingPlans.findFirst({
      where: eq(schema.pricingPlans.slug, slug),
    });

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers,
      });
    }

    const baseUrl = process.env.VITE_APP_URL || 'https://tendertalks.live';
    const planUrl = `${baseUrl}/pricing?plan=${plan.slug}`;
    const price = parseFloat(plan.price);
    const description = plan.description || `Subscribe to ${plan.name} for ₹${price}/${plan.interval}`;

    return new Response(JSON.stringify({
      title: `${plan.name} Plan | TenderTalks`,
      description,
      image: `${baseUrl}/og-image.svg`,
      url: planUrl,
      type: 'product',
      siteName: 'TenderTalks',
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features,
    }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching plan metadata:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
