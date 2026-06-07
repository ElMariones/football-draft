import type { Metadata, Viewport } from 'next';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

export const metadata: Metadata = {
  title: 'Football Draft — Spin Your Premier League XI',
  description:
    'Spin the wheel, get a random Premier League team from a random era, and simulate a full season.',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <ErrorBoundary>{children}</ErrorBoundary>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
