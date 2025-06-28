const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// TypeScript 타입 정의
type CustomRequest = {
  body: any;
  method: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[]>;
  [key: string]: any;
};

type CustomResponse = {
  status: (code: number) => CustomResponse;
  json: (data: any) => void;
  send: (data: any) => void;
  set: (header: string, value: string) => CustomResponse;
  header: (header: string, value: string) => CustomResponse;
  sendStatus: (code: number) => void;
  success: (data: any, statusCode?: number) => void;
  error: (message: string, statusCode?: number, details?: any) => void;
  [key: string]: any;
};

type ExpressNextFunction = (err?: any) => void;

// Express 앱 생성
const app = express();

// CORS 옵션 설정
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 개발 환경에서는 모든 오리진 허용
    if (process.env.NODE_ENV === 'development') {
      console.log('개발 모드: 모든 오리진 허용');
      callback(null, true);
    } else {
      // 프로덕션 환경에서는 특정 도메인만 허용
      const allowedOrigins = [
        'https://antioch-seminar.web.app/'
      ];
      
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`차단된 오리진: ${origin}`);
        callback(new Error('CORS 정책에 의해 차단되었습니다.'));
      }
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

// CORS 미들웨어 적용
app.use(cors(corsOptions));

// 요청 본문 크기 제한 설정 (10MB)
const MAX_REQUEST_BODY_SIZE = '10mb';

// JSON 파싱 미들웨어
app.use(bodyParser.json({ 
  limit: MAX_REQUEST_BODY_SIZE,
  strict: false // JSON 파싱을 덜 엄격하게 처리
}));

// URL 인코딩된 데이터 파싱
app.use(bodyParser.urlencoded({ 
  extended: true, // qs 라이브러리 사용 (false면 querystring 사용)
  limit: MAX_REQUEST_BODY_SIZE
}));

// 요청 로깅 미들웨어 (개발 환경에서만 활성화)
if (process.env.NODE_ENV === 'development') {
  app.use((req: CustomRequest, _res: CustomResponse, next: ExpressNextFunction) => {
    // 헤더에서 민감한 정보 제거
    const headers = { ...req.headers };
    if (headers.authorization) {
      headers.authorization = '***';
    }
    
    console.log(`\n=== ${new Date().toISOString()} ===`);
    console.log(`${req.method} ${req.originalUrl}`);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    
    // 바디가 있는 경우에만 로깅 (파일 업로드 등 대용량 바디는 제외)
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    
    console.log('==============================\n');
    next();
  });
}

// 응답 헬퍼 미들웨어
app.use((_req: CustomRequest, res: CustomResponse, next: ExpressNextFunction) => {
  // 성공 응답 헬퍼
  res.success = function(data: any, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  };
  
  // 에러 응답 헬퍼
  res.error = function(message: string, statusCode: number = 500, details?: any) {
    const errorResponse: any = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };
    
    if (details) {
      errorResponse.details = details;
    }
    
    return res.status(statusCode).json(errorResponse);
  };
  
  next();
});

// API 라우트 설정
app.post('/api/check', async (req: CustomRequest, res: CustomResponse) => {
  try {
    const { checkHandler } = await import('./api/check');
    await checkHandler(req, res);
  } catch (error: unknown) {
    console.error('API Error (check):', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

app.post('/api/saveUser', async (req: CustomRequest, res: CustomResponse) => {
  try {
    const { saveUserHandler } = await import('./api/save');
    await saveUserHandler(req, res);
  } catch (error: unknown) {
    console.error('API Error (saveUser):', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// 404 핸들러 (라우트가 없는 경우)
app.use((_req: CustomRequest, res: CustomResponse) => {
  const response = {
    success: false,
    error: '요청하신 리소스를 찾을 수 없습니다.',
    timestamp: new Date().toISOString()
  };
  
  console.log('\n=== 404 Not Found ===');
  console.log('요청 URL:', _req.originalUrl);
  console.log('요청 메서드:', _req.method);
  console.log('응답:', JSON.stringify(response, null, 2));
  console.log('====================\n');
  
  res.status(404).json(response);
});

// 최상위 에러 핸들러 (모든 에러를 여기서 처리)
app.use((err: any, req: CustomRequest, res: CustomResponse, _next: ExpressNextFunction) => {
  // 에러 응답 객체 생성
  const errorResponse = {
    success: false,
    error: '내부 서버 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };
  
  // 에러 로깅
  console.error('\n=== 서버 에러 발생 ===');
  console.error('에러 시간:', new Date().toISOString());
  console.error('에러 메시지:', err.message);
  console.error('에러 스택:', err.stack);
  console.error('요청 URL:', req.originalUrl);
  console.error('요청 메서드:', req.method);
  console.error('요청 헤더:', JSON.stringify(req.headers, null, 2));
  console.error('요청 바디:', JSON.stringify(req.body, null, 2));
  console.error('에러 응답:', JSON.stringify(errorResponse, null, 2));
  console.error('========================\n');
  
  // 클라이언트에 에러 응답 전송
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(errorResponse);
});

// Firebase Functions 설정 및 내보내기
export const api = functions
  .region('asia-northeast3')
  .runWith({
    memory: '1GB',
    timeoutSeconds: 60,
  })
  .https.onRequest((req: CustomRequest, res: CustomResponse) => {
    // CORS 헤더 설정 (개발 환경에서만 모든 도메인 허용)
    if (process.env.NODE_ENV === 'development') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      
      // OPTIONS 메서드에 대한 프리플라이트 응답
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }
    }
    
    // 실제 요청 처리
    return app(req, res);
  });

// 환경 변수 로깅 (디버깅용)
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  FUNCTION_NAME: process.env.FUNCTION_NAME,
  FUNCTION_TARGET: process.env.FUNCTION_TARGET,
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? 'Set' : 'Not set',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set',
  SPREADSHEET_ID: process.env.SPREADSHEET_ID ? 'Set' : 'Not set'
});
