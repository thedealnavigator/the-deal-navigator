import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/go/:id',
        destination: '/api/go/:id',
      },
    ];
  },
};

export default nextConfig;
