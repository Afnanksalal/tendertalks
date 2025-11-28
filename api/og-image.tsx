import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'TenderTalks';
    const subtitle = searchParams.get('subtitle') || 'Come talk with Afnan & Jenna';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: '#030014',
            padding: '60px 80px',
            position: 'relative',
          }}
        >
          {/* Background gradient effects */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 70%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-150px',
              left: '-100px',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(112,0,255,0.15) 0%, transparent 70%)',
            }}
          />

          {/* Microphone icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <rect x="15" y="5" width="30" height="45" rx="15" fill="url(#grad)" />
              <rect x="22" y="15" width="16" height="4" rx="2" fill="#030014" />
              <rect x="22" y="25" width="16" height="4" rx="2" fill="#030014" />
              <rect x="22" y="35" width="16" height="4" rx="2" fill="#030014" />
              <path d="M10 40 Q10 55 30 55 Q50 55 50 40" stroke="#00F0FF" strokeWidth="4" fill="none" />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="100%" stopColor="#7000FF" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '16px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '32px',
              fontWeight: 500,
              color: '#00F0FF',
              marginBottom: '24px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {subtitle}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: '24px',
              color: '#94a3b8',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Exploring AI, Tech, and Human Connection
          </div>

          {/* Accent line */}
          <div
            style={{
              marginTop: '32px',
              width: '200px',
              height: '4px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #00F0FF 0%, #7000FF 100%)',
            }}
          />

          {/* URL */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '80px',
              fontSize: '20px',
              color: '#64748b',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            tendertalks.live
          </div>

          {/* Sound waves */}
          <div
            style={{
              position: 'absolute',
              right: '100px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '12px',
              opacity: 0.5,
            }}
          >
            <div style={{ width: '4px', height: '80px', background: '#00F0FF', borderRadius: '2px' }} />
            <div style={{ width: '4px', height: '120px', background: '#00F0FF', borderRadius: '2px' }} />
            <div style={{ width: '4px', height: '160px', background: '#00F0FF', borderRadius: '2px' }} />
            <div style={{ width: '4px', height: '120px', background: '#00F0FF', borderRadius: '2px' }} />
            <div style={{ width: '4px', height: '80px', background: '#00F0FF', borderRadius: '2px' }} />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('OG Image generation error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
