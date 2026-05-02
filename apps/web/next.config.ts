import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@afterclass/shared", "@afterclass/ui"],
};

export default nextConfig;
