/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com https://www.gstatic.com https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.googleapis.com https://*.gstatic.com https://*.amazonaws.com https://api.razorpay.com https://lumberjack.razorpay.com ws: wss:",
  "frame-src 'self' https://www.google.com https://*.google.com https://*.gstatic.com https://api.razorpay.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=(), payment=(self)',
          },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },

  // API proxy to backend
  async rewrites() {
    // Vercel server-side doesn't always read NEXT_PUBLIC_ variables during runtime proxy config
    // We check BACKEND_API_URL first, then NEXT_PUBLIC_API_URL, then localhost
    const backendUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      // Prefer 127.0.0.1 on Windows so Node doesn’t hit ::1 when the API only listens on IPv4
      'http://127.0.0.1:4000';
      
    // IMPORTANT: Make sure backendUrl doesn't have a trailing slash
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    
    return [
      {
        source: '/api/:path*',
        destination: `${cleanBackendUrl}/api/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${cleanBackendUrl}/api/v1/:path*`,
      }
    ];
  },

  // Webpack configuration (if needed)
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;

