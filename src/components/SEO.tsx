import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  keywords?: string;
  noIndex?: boolean;
}

const BASE_URL = 'https://tendertalks.live';
const DEFAULT_TITLE = 'TenderTalks | Come talk with Afnan & Jenna';
const DEFAULT_DESCRIPTION = 'Exploring AI, Tech, and Human Connection. Future, unfiltered.';
const DEFAULT_IMAGE = '/api/og-image';

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url = '',
  type = 'website',
  publishedTime,
  keywords,
  noIndex = false,
}: SEOProps) {
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const fullImageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | TenderTalks`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
    </Helmet>
  );
}
