import * as admin from 'firebase-admin';

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const DB = admin.firestore();

// 상수 정의
const COLLECTION_USERS = 'users';

// 타입 정의
interface UserData {
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string | null;
  birthYear: string | null;
  church: string | null;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

// 전화번호 정규화 함수
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // 숫자와 +만 남기고 제거 (국제 전화번호 형식 고려)
  return phone.replace(/[^0-9+]/g, '');
};

// Express 타입 정의 (Firebase Functions 호환을 위한 확장)
type CustomRequest = {
  body: any;
  method: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[]>;
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

// 로깅 유틸리티
const logger = {
  request: (req: CustomRequest) => {
    if (process.env.NODE_ENV === 'development') {
      const url = req.originalUrl || req.url || 'unknown';
      console.log('\n=== 사용자 저장 요청 ===');
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
  
  success: (userId: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n[SUCCESS] 사용자 저장 성공 (ID: ${userId})`);
      console.log('저장된 데이터:', JSON.stringify(data, null, 2));
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

// 사용자 저장 핸들러
export const saveUserHandler = async (
  req: CustomRequest, 
  res: CustomResponse
) => {
  try {
    logger.request(req);
    
    const { name, phone, email, birthYear, church } = req.body;
    
    // 필수 필드 검증
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: '이름과 전화번호는 필수 입력 항목입니다.'
      });
    }
    
    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phone);
    
    // 중복 사용자 확인
    const existingUser = await DB.collection(COLLECTION_USERS)
      .where('normalizedPhone', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (!existingUser.empty) {
      return res.status(409).json({
        success: false,
        error: '이미 등록된 전화번호입니다.'
      });
    }
    
    // 사용자 데이터 준비
    const userData: UserData = {
      name,
      phone: normalizedPhone,
      normalizedPhone,
      email: email || null,
      birthYear: birthYear || null,
      church: church || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Firestore에 사용자 추가
    const docRef = await DB.collection(COLLECTION_USERS).add(userData);
    
    // 생성된 사용자 정보 조회
    const newUser = await docRef.get();
    
    logger.success(docRef.id, userData);
    
    return res.status(201).json({
      success: true,
      userId: docRef.id,
      data: {
        id: docRef.id,
        ...newUser.data()
      },
      message: '사용자 정보가 성공적으로 저장되었습니다.'
    });
    
  } catch (error) {
    console.error('사용자 저장 중 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    logger.error(new Error(errorMessage), 'saveUserHandler');
    
    return res.status(500).json({
      success: false,
      error: '사용자 정보 저장 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};
