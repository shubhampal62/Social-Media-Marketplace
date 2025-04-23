import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ['127.0.0.1','192.168.2.233'],
  },
};

export default nextConfig;
