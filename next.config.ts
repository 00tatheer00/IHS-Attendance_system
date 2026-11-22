import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind CSS v4 via Turbopack
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Excel class lists are uploaded through a server action.
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Native/heavy server-only packages: load from node_modules at runtime instead of bundling.
  serverExternalPackages: ["exceljs", "jspdf", "jspdf-autotable"],
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icons/icon-192.png", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera only for this site (scanner), nothing else.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
