import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../src/db/schema';
import { eq, desc } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
}

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers,
    });
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      let query = db.select().from(schema.podcasts);
      
      if (status) {
        query = query.where(eq(schema.podcasts.status, status as any)) as any;
      }

      const result = await query.orderBy(desc(schema.podcasts.createdAt)).limit(limit);

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      console.error('Error fetching podcasts:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const {
        title,
        description,
        thumbnailUrl,
        mediaUrl,
        mediaType = 'audio',
        duration,
        isFree = false,
        price = '0',
        isDownloadable = false,
        categoryId,
        status = 'draft',
      } = body;

      if (!title || !description) {
        return new Response(JSON.stringify({ error: 'Title and description required' }), {
          status: 400,
          headers,
        });
      }

      const slug = generateSlug(title);

      const [podcast] = await db
        .insert(schema.podcasts)
        .values({
          title,
          slug,
          description,
          thumbnailUrl,
          mediaUrl,
          mediaType,
          duration,
          isFree,
          price,
          isDownloadable,
          categoryId,
          status,
          createdBy: userId,
        })
        .returning();

      return new Response(JSON.stringify(podcast), { status: 201, headers });
    } catch (error) {
      console.error('Error creating podcast:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers,
  });
}

export const config = {
  runtime: 'edge',
};
