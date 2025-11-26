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
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
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
    const slug = pathParts[pathParts.length - 1];

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug required' }), {
        status: 400,
        headers,
      });
    }

    const result = await db
      .select({
        podcast: schema.podcasts,
        category: schema.categories,
        creator: {
          id: schema.users.id,
          name: schema.users.name,
          avatarUrl: schema.users.avatarUrl,
        },
      })
      .from(schema.podcasts)
      .leftJoin(schema.categories, eq(schema.podcasts.categoryId, schema.categories.id))
      .leftJoin(schema.users, eq(schema.podcasts.createdBy, schema.users.id))
      .where(eq(schema.podcasts.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Podcast not found' }), {
        status: 404,
        headers,
      });
    }

    const podcastTagsResult = await db
      .select({ tag: schema.tags })
      .from(schema.podcastTags)
      .innerJoin(schema.tags, eq(schema.podcastTags.tagId, schema.tags.id))
      .where(eq(schema.podcastTags.podcastId, result[0].podcast.id));

    const podcast = {
      ...result[0].podcast,
      category: result[0].category,
      creator: result[0].creator,
      tags: podcastTagsResult.map((t) => t.tag),
    };

    // Increment view count (fire and forget)
    db.update(schema.podcasts)
      .set({ viewCount: (result[0].podcast.viewCount || 0) + 1 })
      .where(eq(schema.podcasts.id, result[0].podcast.id))
      .catch(console.error);

    return new Response(JSON.stringify(podcast), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
