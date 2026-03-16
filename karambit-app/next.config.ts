import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stacks/connect"],
  reactCompiler: true,
};

export default nextConfig;
