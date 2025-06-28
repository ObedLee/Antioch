const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  // 정적 내보내기 설정 (API 라우트를 사용하지 않으므로 주석 처리)
  // output: 'export',
  
  // Firebase 호스팅을 위한 이미지 설정
  images: {
    unoptimized: true,
    domains: ['firebasestorage.googleapis.com'],
  },
  
  // 환경 변수 설정
  env: {
    // 서버/클라이언트 모두에서 사용할 환경 변수
    GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    
    // 클라이언트 측에서만 사용할 환경 변수
    NEXT_PUBLIC_API_BASE_URL: isProd 
      ? `https://antioch-seminar.web.app/api` 
      : '/api',
  },
  
  // API 라우트 활성화
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  
  // 리다이렉트 및 리라이트 설정
  async rewrites() {
    return [
      // API 요청을 처리하기 위한 리라이트 규칙
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;