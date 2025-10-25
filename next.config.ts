import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hvgldqjpwltercyqvhsj.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/event-images/**",
      },
    ],
  },
};

export default nextConfig;
