import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phone and other LAN devices load dev scripts from these hosts.
  // 192.168.*.* covers Wi-Fi (192.168.0.146) and Ethernet (192.168.18.204).
  allowedDevOrigins: ["192.168.*.*"],
  transpilePackages: ["@iqbol/shared"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Browsers ignore this over plain http, so local development is unaffected.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    const api = process.env.API_URL ?? "http://localhost:3011/api";
    const origin = api.replace(/\/api\/?$/, "");
    return [
      {
        source: "/uploads/:path*",
        destination: `${origin}/api/uploads/files/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;
