import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { podcasts, categories, users, tags, podcastTags } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client);

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const slug = url.pathname.split('/').pop();

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await db
      .select({
        podcast: podcasts,
        category: categories,
        creator: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(podcasts)
      .leftJoin(categories, eq(podcasts.categoryId, categories.id))
      .leftJoin(users, eq(podcasts.createdBy, users.id))
      .where(eq(podcasts.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Podcast not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get tags
    const podcastTagsResult = await db
      .select({ tag: tags })
      .from(podcastTags)
      .innerJoin(tags, eq(podcastTags.tagId, tags.id))
      .where(eq(podcastTags.podcastId, result[0].podcast.id));

    const podcast = {
      ...result[0].podcast,
      category: result[0].category,
      creator: result[0].creator,
      tags: podcastTagsResult.map((t) => t.tag),
    };

    // Increment view count
    await db
      .update(podcasts)
      .set({ viewCount: (result[0].podcast.viewCount || 0) + 1 })
      .where(eq(podcasts.id, result[0].podcast.id));

    return new Response(JSON.stringify(podcast), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  runtime: 'edge',
};
