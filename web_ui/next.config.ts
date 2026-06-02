import type { NextConfig } from "next";

// .env.local의 AUTH_URL에서 도메인을 추출하여 허용 목록에 추가합니다.
let allowedOrigins: string[] = [];
if (process.env.AUTH_URL) {
  try {
    const url = new URL(process.env.AUTH_URL);
    allowedOrigins.push(url.hostname);
  } catch (e) {
    // 무시
  }
}

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
  // next/image를 위한 외부 도메인 설정 (Unsplash 허용)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
