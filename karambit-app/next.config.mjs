/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@stacks/transactions", "@stacks/network"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      pino: false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;