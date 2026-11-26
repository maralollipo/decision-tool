import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf bringt einen eigenen pdf.js-Build mit; nicht bündeln.
  serverExternalPackages: ["unpdf"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
