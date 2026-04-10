/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

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

