import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Vehicle photos and avatars served from Vercel Blob in production.
      // next/image refuses any external host that is not listed here.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Surfaces a bad deploy immediately instead of shipping a broken build.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
