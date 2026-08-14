import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  experimental: {
    proxyClientMaxBodySize: "10mb",
  },
};

export default nextConfig;
