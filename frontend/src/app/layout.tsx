/**
 * TatvaOps Vision - Root Layout
 *
 * Enterprise SaaS aesthetic with:
 * - Material UI theme
 * - Redux state management
 * - Custom JWT auth via auth-service (cookies + Bearer)
 * - Global providers
 */

import type { Metadata, Viewport } from 'next';
import { Providers } from '@/providers';

import './globals.css';

const THEME_COLOR = '#0a0a0f';

export const metadata: Metadata = {
  title: 'TatvaOps Vision - AI Interior Design Platform',
  description:
    'Transform your spaces with AI-powered interior design. From floor plans to 3D visualizations.',
  keywords: ['interior design', 'AI', 'floor plan', 'moodboard', '3D visualization'],
  robots: 'index, follow',
  authors: [{ name: 'TatvaOps' }],
  creator: 'TatvaOps',
  publisher: 'TatvaOps',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vision',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: THEME_COLOR,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
