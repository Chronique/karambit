import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stacks/transactions", "@stacks/network"],
  serverExternalPackages: ["@stacks/connect"],
};

export default nextConfig;