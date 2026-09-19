import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      {
        source: "/dashboard/products",
        destination: "/dashboard/catalog",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
