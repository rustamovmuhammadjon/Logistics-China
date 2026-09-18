import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Expo driver pulls @types/react@18 while Next uses 19; types conflict on Suspense only.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Without this, every page (even one you just visited) refetches from
    // scratch on each navigation — Next 15 defaults dynamic pages to no
    // client-side cache. This lets the browser reuse an already-loaded page
    // for 30s so going back and forth between pages is instant; any actual
    // mutation still calls router.refresh(), which busts the cache anyway.
    staleTimes: {
      dynamic: 30,
    },
  },
  transpilePackages: ["@logistics/shared", "iconsax-react"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
