import type { NextConfig } from "next";

const nextConfig = {
  transpilePackages: ["@stacks/connect", "@stacks/transactions", "@stacks/network"],
};

export default nextConfig;