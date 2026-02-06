import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'thespacedevs-prod.nyc3.digitaloceanspaces.com',
      'spacelaunchnow-prod-east.nyc3.digitaloceanspaces.com',
      'i.ytimg.com',
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
};

export default nextConfig;
