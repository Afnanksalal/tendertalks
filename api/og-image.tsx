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
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#030014',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Gradient background overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle at center, rgba(0,240,255,0.2) 0%, transparent 60%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle at center, rgba(112,0,255,0.15) 0%, transparent 60%)',
            }}
          />

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px',
              zIndex: 10,
            }}
          >
            {/* Logo/Icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)',
                marginBottom: '30px',
              }}
            >
              <div
                style={{
                  fontSize: '40px',
                  color: 'white',
                }}
              >
                🎙️
              </div>
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: '64px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '16px',
                letterSpacing: '-2px',
              }}
            >
              {title}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: '28px',
                fontWeight: 500,
                color: '#00F0FF',
                marginBottom: '20px',
              }}
            >
              {subtitle}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: '22px',
                color: '#94a3b8',
                maxWidth: '600px',
              }}
            >
              Exploring AI, Tech, and Human Connection
            </div>

            {/* Accent line */}
            <div
              style={{
                marginTop: '30px',
                width: '150px',
                height: '4px',
                borderRadius: '2px',
                background: 'linear-gradient(90deg, #00F0FF 0%, #7000FF 100%)',
              }}
            />
          </div>

          {/* URL at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              fontSize: '18px',
              color: '#64748b',
            }}
          >
            tendertalks.live
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
