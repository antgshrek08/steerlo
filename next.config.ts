import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com"
      },
      {
        protocol: "https",
        hostname: "logo.clearbit.com"
      },
      {
        protocol: "https",
        hostname: "www.google.com"
      }
    ]
  }
};

export default nextConfig;
