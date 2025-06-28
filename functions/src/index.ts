import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Express 응답 타입 확장

// Express 및 CORS 임포트
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Express 앱 생성
const app = express();

// Firebase Admin 초기화
try {
  admin.initializeApp();
  console.log('Firebase Admin SDK initialized');
} catch (error) {
  console.error('Firebase Admin SDK initialization error:', error);
  throw error;
}

// Express 타입 정의
type ExpressRequest = {
  [key: string]: any;
  body: any;
  params: any;
  query: any;
  method: string;
  originalUrl: string;
  headers: any;
};

type ExpressResponse = {
  status: (code: number) => ExpressResponse;
  json: (data: any) => void;
  send: (data: any) => void;
  set: (header: string, value: string) => ExpressResponse;
  sendStatus: (code: number) => void;
};

type ExpressNextFunction = (err?: any) => void;

// 미들웨어 설정
app.use(cors({ origin: true }));
app.use(bodyParser.json());

// 요청 로깅 미들웨어
app.use((req: ExpressRequest, _res: ExpressResponse, next: ExpressNextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API 라우트 임포트
import { checkHandler } from './api/check';
import { saveUserHandler } from './api/saveUser';

// API 라우트 설정
app.post('/api/check', (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
  console.log('API 요청 수신:', { 
    body: req.body,
    headers: req.headers,
    originalUrl: req.originalUrl,
    method: req.method
  });
  
  // checkHandler 호출
  // @ts-ignore - Ignore type checking for now
  checkHandler(req, res).catch(next);
});

// 404 핸들러
// 사용자 저장 엔드포인트
app.post('/api/saveUser', async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
  console.log('Save User 요청 수신:', { 
    body: req.body,
    headers: req.headers,
    originalUrl: req.originalUrl,
    method: req.method
  });
  
  try {
    // @ts-ignore
    await saveUserHandler(req, res);
  } catch (error) {
    next(error);
  }
});

// 404 핸들러
app.use((req: ExpressRequest, res: ExpressResponse) => {
  console.warn('404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    success: false,
    error: 'Not Found',
    path: req.originalUrl 
  });
});

// 에러 핸들러
app.use((err: Error, req: ExpressRequest, res: ExpressResponse) => {
  console.error('Unhandled error:', {
    error: err,
    stack: err.stack,
    url: req?.originalUrl,
    method: req?.method,
    body: req?.body
  });
  
  res.status(500).json({ 
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Server error occurred' : err.message
  });
});

// CORS 미들웨어를 Express 앱에 추가
app.use((req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS 요청에 대한 처리 (CORS 프리플라이트 요청)
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  next();
});

// Firebase Functions로 내보내기
const api = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https.onRequest(app);

// 모든 함수를 하나의 객체로 내보내기
export { api };

// 환경 변수 로깅 (디버깅용)
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  FUNCTION_NAME: process.env.FUNCTION_NAME,
  FUNCTION_TARGET: process.env.FUNCTION_TARGET,
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? 'Set' : 'Not set',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set',
  SPREADSHEET_ID: process.env.SPREADSHEET_ID ? 'Set' : 'Not set'
});
