/**
 * TatvaOps Vision - Root Layout
 *
 * Enterprise SaaS aesthetic with:
 * - Material UI theme
 * - Redux state management
 * - Clerk auth (useUser, useClerk, useAuth via ClerkProvider in Providers)
 * - Global providers
 */

import type { Metadata, Viewport } from 'next';
import { Providers } from '@/providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'TatvaOps Vision - AI Interior Design Platform',
  description:
    'Transform your spaces with AI-powered interior design. From floor plans to 3D visualizations.',
  keywords: ['interior design', 'AI', 'floor plan', 'moodboard', '3D visualization'],
  robots: 'index, follow',
  authors: [{ name: 'TatvaOps' }],
  creator: 'TatvaOps',
  publisher: 'TatvaOps',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FFFFFF',
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
