import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
