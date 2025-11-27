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
    // Path: /api/podcasts/[slug]/metadata -> slug is second to last
    const slug = pathParts[pathParts.length - 2];

    if (!slug || slug === 'metadata') {
      return new Response(JSON.stringify({ error: 'Slug required' }), {
        status: 400,
        headers,
      });
    }

    const podcast = await db.query.podcasts.findFirst({
      where: eq(schema.podcasts.slug, slug),
    });

    if (!podcast) {
      return new Response(JSON.stringify({ error: 'Podcast not found' }), {
        status: 404,
        headers,
      });
    }

    const baseUrl = process.env.VITE_APP_URL || 'https://tendertalks.live';
    const podcastUrl = `${baseUrl}/podcast/${podcast.slug}`;
    const imageUrl = podcast.thumbnailUrl || `${baseUrl}/og-image.svg`;
    const description = podcast.description?.slice(0, 200) || 'Listen on TenderTalks';

    return new Response(JSON.stringify({
      title: `${podcast.title} | TenderTalks`,
      description,
      image: imageUrl,
      url: podcastUrl,
      type: podcast.mediaType === 'video' ? 'video.other' : 'music.song',
      siteName: 'TenderTalks',
      duration: podcast.duration,
      mediaType: podcast.mediaType,
      isFree: podcast.isFree,
    }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching podcast metadata:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
