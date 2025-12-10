import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export - cPanel için
  output: 'export',
  trailingSlash: true,

  // Harici bağlantıları kısıtla
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
};

export default nextConfig;
