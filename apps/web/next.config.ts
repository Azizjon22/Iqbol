import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phone and other LAN devices load dev scripts from these hosts.
  // 192.168.*.* covers Wi-Fi (192.168.0.146) and Ethernet (192.168.18.204).
  allowedDevOrigins: ["192.168.*.*"],
  transpilePackages: ["@shodiyora/shared"],
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
