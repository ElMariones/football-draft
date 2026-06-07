import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = Math.min(Number(searchParams.get('size')) || 192, 1024);
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.45);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #FFD700, #B8860B)',
        borderRadius: radius,
        fontSize,
        fontWeight: 900,
        color: '#000',
        fontFamily: 'sans-serif',
      }}
    >
      XI
    </div>,
    { width: size, height: size },
  );
}
