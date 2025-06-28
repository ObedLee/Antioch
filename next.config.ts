const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  // 정적 내보내기 설정
  output: 'export',
  

  // 이미지 최적화 비활성화 (정적 내보내기 시 필요)
  images: {
    unoptimized: true,
  },
  
  // 리다이렉트 및 리라우트 설정
  async rewrites() {
    if (isProd) {
      // 프로덕션 환경에서는 API 요청을 별도 서버로 프록시
      return [
        {
          source: '/api/:path*',
          destination: 'https://antioch-seminar.web.app//api/:path*', // 실제 API 서버 주소로 변경 필요
        },
      ];
    }
    // 개발 환경에서는 Next.js API 라우트 사용
    return [];
  },
  
  // 환경 변수 설정
  env: {
    // 서버/클라이언트 모두에서 사용할 환경 변수
    GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    
    // 클라이언트 측에서 사용할 환경 변수
    NEXT_PUBLIC_API_BASE_URL: isProd 
      ? `https://antioch-seminar.web.app//api` 
      : '/api',
  },
};

export default nextConfig;