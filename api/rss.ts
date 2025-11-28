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

    const baseUrl = 'https://tendertalks.live';
    const now = new Date().toUTCString();

    // Build RSS XML
    const rssItems = podcasts.map((p: any) => {
      const pubDate = p.published_at ? new Date(p.published_at).toUTCString() : now;
      const duration = p.duration ? formatDuration(p.duration) : '';
      const description = escapeXml(p.description || '');
      const title = escapeXml(p.title);
      
      return `
    <item>
      <title>${title}</title>
      <link>${baseUrl}/podcast/${p.slug}</link>
      <guid isPermaLink="true">${baseUrl}/podcast/${p.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
      ${p.category_name ? `<category>${escapeXml(p.category_name)}</category>` : ''}
      ${p.thumbnail_url ? `<itunes:image href="${p.thumbnail_url}" />` : ''}
      ${p.media_url ? `
      <enclosure url="${p.media_url}" type="${p.media_type === 'video' ? 'video/mp4' : 'audio/mpeg'}" />
      ` : ''}
      ${duration ? `<itunes:duration>${duration}</itunes:duration>` : ''}
    </item>`;
    }).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
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
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to generate RSS feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
