import type { NextConfig } from "next";

const allowedOrigins: string[] = [];

if (process.env.AUTH_URL) {
  try {
    allowedOrigins.push(new URL(process.env.AUTH_URL).hostname);
  } catch {
    // Ignore malformed local auth URLs.
  }
}

const nextConfig: NextConfig = {
  // output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  allowedDevOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
};

export default nextConfig;
