import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  title: 'Football Draft — Build Your All-Time XI',
  description:
    'Spin the wheel for a random team and era. Pick one player. Repeat 11 times to forge your fantasy XI, then simulate a full Premier League, La Liga, or Champions League season.',
  metadataBase: new URL(baseUrl),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/api/icon?size=180',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Football Draft — Build Your All-Time XI',
    description: 'Spin for a team. Pick one player. Repeat 11 times. Simulate a full season. Can you win the league?',
    type: 'website',
    siteName: 'Football Draft',
    images: [`${baseUrl}/api/og`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Football Draft — Build Your All-Time XI',
    description: 'Spin for a team. Pick one player. Repeat 11 times. Simulate a full season.',
    images: [`${baseUrl}/api/og`],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <ErrorBoundary>{children}</ErrorBoundary>
        </SessionProviderWrapper>
        {/* Outside the error boundary on purpose: analytics must not be able to
            take the page down, and a crashed page should still report itself. */}
        <Analytics />
      </body>
    </html>
  );
}
