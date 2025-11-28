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
    // Path: /api/blogs/[slug]/metadata -> slug is second to last
    const slug = pathParts[pathParts.length - 2];

    if (!slug || slug === 'metadata' || slug === 'blogs') {
      return new Response(JSON.stringify({ error: 'Slug required' }), {
        status: 400,
        headers,
      });
    }

    const blog = await db.query.blogs.findFirst({
      where: eq(schema.blogs.slug, slug),
      with: {
        creator: {
          columns: { name: true },
        },
      },
    });

    if (!blog) {
      return new Response(JSON.stringify({ error: 'Blog not found' }), {
        status: 404,
        headers,
      });
    }

    const baseUrl = process.env.VITE_APP_URL || 'https://tendertalks.live';
    const blogUrl = `${baseUrl}/blog/${blog.slug}`;
    const imageUrl = blog.bannerUrl || `${baseUrl}/api/og-image?title=${encodeURIComponent(blog.title)}`;
    const description = blog.excerpt?.slice(0, 200) || blog.title;

    return new Response(JSON.stringify({
      title: `${blog.title} | TenderTalks`,
      description,
      image: imageUrl,
      url: blogUrl,
      type: 'article',
      siteName: 'TenderTalks',
      readTime: blog.readTime,
      publishedAt: blog.publishedAt,
      author: (blog as any).creator?.name || 'TenderTalks',
    }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching blog metadata:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export const config = {
  runtime: 'edge',
};
