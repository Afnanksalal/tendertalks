import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch published podcasts
    const podcasts = await sql`
      SELECT 
        p.id, p.title, p.slug, p.description, p.thumbnail_url,
        p.duration, p.media_url, p.media_type, p.published_at,
        c.name as category_name
      FROM podcasts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.published_at IS NOT NULL
      ORDER BY p.published_at DESC
      LIMIT 50
    `;

    // Fetch published blogs
    const blogs = await sql`
      SELECT 
        b.id, b.title, b.slug, b.excerpt, b.banner_url,
        b.read_time, b.published_at,
        u.name as author_name
      FROM blogs b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.status = 'published' AND b.published_at IS NOT NULL
      ORDER BY b.published_at DESC
      LIMIT 20
    `;

    const baseUrl = process.env.VITE_APP_URL || 'https://tendertalks.live';
    const now = new Date().toUTCString();

    // Build combined items with dates for sorting
    interface FeedItem {
      xml: string;
      date: Date;
    }

    const podcastFeedItems: FeedItem[] = podcasts.map((p: any) => {
      const pubDate = p.published_at ? new Date(p.published_at) : new Date();
      const pubDateStr = pubDate.toUTCString();
      const duration = p.duration ? formatDuration(p.duration) : '';
      const description = escapeXml(p.description || '');
      const title = escapeXml(p.title);
      
      const xml = `
    <item>
      <title>[Podcast] ${title}</title>
      <link>${baseUrl}/podcast/${p.slug}</link>
      <guid isPermaLink="true">${baseUrl}/podcast/${p.slug}</guid>
      <pubDate>${pubDateStr}</pubDate>
      <description><![CDATA[${description}]]></description>
      ${p.category_name ? `<category>${escapeXml(p.category_name)}</category>` : ''}
      ${p.thumbnail_url ? `<itunes:image href="${escapeXml(p.thumbnail_url)}" />` : ''}
      ${p.media_url ? `<enclosure url="${escapeXml(p.media_url)}" type="${p.media_type === 'video' ? 'video/mp4' : 'audio/mpeg'}" length="0" />` : ''}
      ${duration ? `<itunes:duration>${duration}</itunes:duration>` : ''}
    </item>`;
      
      return { xml, date: pubDate };
    });

    const blogFeedItems: FeedItem[] = blogs.map((b: any) => {
      const pubDate = b.published_at ? new Date(b.published_at) : new Date();
      const pubDateStr = pubDate.toUTCString();
      const description = escapeXml(b.excerpt || '');
      const title = escapeXml(b.title);
      const author = b.author_name ? escapeXml(b.author_name) : 'TenderTalks';
      
      const xml = `
    <item>
      <title>[Blog] ${title}</title>
      <link>${baseUrl}/blog/${b.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${b.slug}</guid>
      <pubDate>${pubDateStr}</pubDate>
      <description><![CDATA[${description}]]></description>
      <category>Blog</category>
      <dc:creator>${author}</dc:creator>
      ${b.banner_url ? `<media:thumbnail url="${escapeXml(b.banner_url)}" />` : ''}
      ${b.read_time ? `<content:encoded><![CDATA[<p>${b.read_time} min read</p>]]></content:encoded>` : ''}
    </item>`;
      
      return { xml, date: pubDate };
    });

    // Combine and sort by date (newest first)
    const allItems = [...podcastFeedItems, ...blogFeedItems]
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const rssItems = allItems.map(item => item.xml).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>TenderTalks - Come talk with Afnan &amp; Jenna</title>
    <link>${baseUrl}</link>
    <description>Exploring AI, Tech, and Human Connection. Future, unfiltered. Join Afnan &amp; Jenna as they dive deep into technology, artificial intelligence, and what it means to be human in a digital age.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <ttl>60</ttl>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml" />
    
    <itunes:author>Afnan &amp; Jenna</itunes:author>
    <itunes:summary>Exploring AI, Tech, and Human Connection. Future, unfiltered.</itunes:summary>
    <itunes:owner>
      <itunes:name>TenderTalks</itunes:name>
      <itunes:email>support@tendertalks.live</itunes:email>
    </itunes:owner>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Technology" />
    <itunes:category text="Science">
      <itunes:category text="Technology" />
    </itunes:category>
    <itunes:image href="${baseUrl}/api/og-image" />
    
    <image>
      <url>${baseUrl}/favicon.svg</url>
      <title>TenderTalks</title>
      <link>${baseUrl}</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('RSS feed generation error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TenderTalks - Error</title>
    <description>RSS feed temporarily unavailable</description>
  </channel>
</rss>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      }
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const config = {
  runtime: 'edge',
};
