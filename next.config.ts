import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/events",
        destination: "/sports",
        permanent: false,
      },
      {
        source: "/live",
        destination: "/display",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
