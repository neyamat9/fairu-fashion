import type { NextConfig } from "next";

// Product images are served by the API server (…/uploads/…): allow its host.
const api = new URL(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
);
const apiPattern = {
  protocol: api.protocol.replace(":", "") as "http" | "https",
  hostname: api.hostname,
  ...(api.port ? { port: api.port } : {}),
};

const nextConfig: NextConfig = {
  // lets a production build run beside the dev server (different folder), e.g. NEXT_DIST_DIR=.nextprod for speed checks (avoid dashes in the name: they break the font loader)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Pages the visitor has opened stay in the browser's memory: going back or opening them again is instant (no skeleton).
    // Seconds: 10 minutes for pages that were opened, 30 minutes for pages that were only prefetched.
    staleTimes: { dynamic: 600, static: 1800 },
  },
  images: {
    // when the API runs on this machine (local development), allow the optimizer to fetch from it
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1"].includes(api.hostname),
    remotePatterns: [
      apiPattern,
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
    ],
  },
};

export default nextConfig;
