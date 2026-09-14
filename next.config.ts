import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    tsconfigPath: process.env.NEXT_DIST_DIR === '.next-e2e' ? 'tsconfig.e2e.json' : 'tsconfig.json',
  },
  allowedDevOrigins: ['172.20.35.53'],
  poweredByHeader: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
          },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
            : []),
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
