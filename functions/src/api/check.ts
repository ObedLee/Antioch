import * as admin from 'firebase-admin';

// 상수 정의
const COLLECTION_USERS = 'users';

// 타입 정의
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
  status(code: number): CustomResponse;
  json(data: any): void;
  send(data: any): void;
  set(header: string, value: string): CustomResponse;
  header(header: string, value: string): CustomResponse;
  sendStatus(code: number): void;
  [key: string]: any;
};

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const DB = admin.firestore();

// 전화번호 정규화 함수
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // 숫자만 남기고 제거 (국제 전화번호 형식 고려)
  return phone.replace(/[^0-9+]/g, '');
};

// 로깅 유틸리티
const logger = {
  request: (req: CustomRequest) => {
    if (process.env.NODE_ENV === 'development') {
      const url = req.originalUrl || req.url || 'unknown';
      console.log('\n=== 사용자 확인 요청 ===');
      console.log(`[${new Date().toISOString()}] ${req.method} ${url}`);
      console.log('헤더:', JSON.stringify(req.headers, null, 2));
      console.log('바디:', JSON.stringify(req.body, null, 2));
      console.log('========================\n');
    }
  },
  
  error: (error: Error, context: string = '') => {
    console.error(`\n[ERROR] ${new Date().toISOString()} - ${context}`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  },
  
  success: (phone: string, exists: boolean) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n[SUCCESS] 사용자 확인 완료 (전화번호: ${phone})`);
      console.log(`사용자 존재 여부: ${exists}`);
    }
  },
  
  response: (status: number, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== 응답 정보 (${status}) ===`);
      console.log(JSON.stringify(data, null, 2));
      console.log('===========================');
    }
  }
};



// 사용자 확인 핸들러
export const checkHandler = async (
  req: CustomRequest, 
  res: CustomResponse, 
  next?: (err?: any) => void
) => {
  try {
    logger.request(req);
    
    const { phone } = req.body;
    
    // 필수 파라미터 확인
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: '전화번호를 입력해주세요.'
      });
    }
    
    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phone);
    
    // Firestore에서 사용자 조회
    const userSnapshot = await DB.collection(COLLECTION_USERS)
      .where('phone', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      logger.success(normalizedPhone, false);
      return res.status(200).json({
        success: true,
        exists: false,
        message: '등록 가능한 전화번호입니다.'
      });
    } else {
      const userData = userSnapshot.docs[0].data();
      logger.success(normalizedPhone, true);
      return res.status(200).json({
        success: true,
        exists: true,
        data: {
          id: userSnapshot.docs[0].id,
          ...userData
        },
        message: '이미 등록된 전화번호입니다.'
      });
    }
    
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    logger.error(new Error(errorMessage), '사용자 확인 중 오류 발생');
    
    const errorResponse = {
      success: false,
      error: '사용자 확인 중 오류가 발생했습니다.',
      ...(process.env.NODE_ENV === 'development' && {
        details: errorMessage,
        stack: errorStack
      }),
      timestamp: new Date().toISOString()
    };
    
    logger.response(500, errorResponse);
    
    // 에러가 있는 경우 next로 전달하거나, 없는 경우 500 응답 반환
    if (next) {
      return next(error);
    }
    
    return res.status(500).json(errorResponse);
  }
};
