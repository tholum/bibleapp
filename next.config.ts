import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trailing slashes for clean URLs
  trailingSlash: true,

  // Unoptimized images for simplicity
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
