import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    tsconfigPath: process.env.NEXT_DIST_DIR === '.next-e2e' ? 'tsconfig.e2e.json' : 'tsconfig.json',
  },
  allowedDevOrigins: ['172.20.35.53'],
  reactStrictMode: true,
};

export default nextConfig;
