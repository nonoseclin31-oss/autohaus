import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudflare's free plan has no image resizing service, and next/image's
    // own optimiser cannot run in the Workers runtime. Photos are therefore
    // served as uploaded — which is why the uploader downscales and converts
    // to WebP in the browser before anything is sent (see lib/image-resize.ts).
    unoptimized: true,
    remotePatterns: [
      // R2 public bucket, either r2.dev or a custom domain.
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "media.autohausmotion.com" },
    ],
  },
  // Keep Prisma out of Next's own bundle. Otherwise Next resolves it with
  // Node export conditions and bakes in the native query engine, which does
  // not exist on Workers. Left external, the OpenNext/esbuild pass resolves
  // it with the `workerd` condition instead and picks Prisma's WASM engine.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],

  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;

// Gives `next dev` access to the R2 binding and other Cloudflare bindings,
// so local development behaves like production when you want it to.
if (process.env.NODE_ENV === "development") {
  void (async () => {
    try {
      const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
      await initOpenNextCloudflareForDev();
    } catch {
      // Not installed or not needed — plain `next dev` still works.
    }
  })();
}
