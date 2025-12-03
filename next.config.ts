import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  devIndicators: {
    position: "top-left"
  },
  // Enable instrumentation hook for loading .env.production in PM2 deployments
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
