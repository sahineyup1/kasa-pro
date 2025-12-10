import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cPanel/Node.js için standalone output
  output: 'standalone',

  // Harici bağlantıları kısıtla
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
