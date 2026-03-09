/**
 * TatvaOps Vision - Root Layout
 * 
 * Enterprise SaaS aesthetic with:
 * - Material UI theme
 * - Redux state management
 * - Clerk authentication
 * - Global providers
 * 
 * Visual inspiration: Apple iCloud, Google Cloud Console, Linear
 */

import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
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
  // Always use ClerkProvider - it handles missing keys gracefully in development
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
