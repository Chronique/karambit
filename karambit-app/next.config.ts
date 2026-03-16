import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stacks/connect", "@stacks/connect-react"],
};

export default nextConfig;