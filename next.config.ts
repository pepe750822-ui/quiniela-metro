import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
