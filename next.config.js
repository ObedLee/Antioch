/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel SSR 최적화 설정
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app']
    },
  },
  // 이미지 최적화 설정
  images: {
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
  },
  // 성능 최적화
  compress: true,
  poweredByHeader: false,
  
  // 보안 헤더 설정 (Google 로그인 팝업 문제 해결)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ]
  },
  
  // PWA 지원을 위한 설정
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/sw.js'
      },
      {
        source: '/manifest.json',
        destination: '/manifest.json'
      }
    ]
  },
}

module.exports = nextConfig
