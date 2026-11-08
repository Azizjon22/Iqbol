import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phone and other LAN devices load dev scripts from these hosts.
  // 192.168.*.* covers Wi-Fi (192.168.0.146) and Ethernet (192.168.18.204);
  // 172.20.10.* is a phone hotspot.
  allowedDevOrigins: ["192.168.*.*", "172.20.10.*"],
  transpilePackages: ["@iqbol/shared"],
  async rewrites() {
    const api = process.env.API_URL ?? "http://localhost:3101/api";
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
