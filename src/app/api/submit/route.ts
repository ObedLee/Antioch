import { NextResponse } from 'next/server';

// Firebase Functions URL (환경 변수에서 가져오거나 직접 설정)
const FIREBASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 
  'https://us-central1-antioch-seminar.cloudfunctions.net/api';

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 사용자 데이터 인터페이스 정의
interface UserData {
  name: string;
  phone: string;
  birthYear: string;
  church: string;
  createdAt?: string;
  updatedAt?: string;
}

// Firebase Functions를 통해 사용자 등록/업데이트
const saveUserToFirebase = async (userData: UserData) => {
  try {
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/saveUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...userData,
        normalizedPhone: userData.phone.replace(/[^0-9]/g, ''),
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = await response.text();
      }
      
      console.error('Firebase Functions 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(
        errorData?.message || 
        errorData?.error?.message || 
        `Firebase Functions 오류: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log('Firebase Functions 응답:', data);
    return data;
  } catch (error) {
    console.error('Firebase Functions 호출 중 오류 발생:', error);
    throw new Error(`사용자 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  // OPTIONS 메서드에 대한 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // 요청 본문 파싱
    const body = await request.json();
    console.log('Received form data:', body);

    // 필수 필드 검증
    const { name, phone, birthYear, church } = body as {
      name?: string;
      phone?: string;
      birthYear?: string;
      church?: string;
    };

    if (!name || !phone || !birthYear || !church) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: '모든 필드를 입력해주세요.' 
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // 전화번호 형식 검증 (숫자만 남기고 제거)
    const phoneNumber = phone.replace(/[^0-9]/g, '');
    if (phoneNumber.length < 10) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: '유효한 전화번호를 입력해주세요.' 
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // 사용자 데이터 준비
    const userData: UserData = {
      name: name.trim(),
      phone: phoneNumber,
      birthYear: birthYear.trim(),
      church: church.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Saving user data to Firebase:', userData);
    
    // Firebase에 사용자 데이터 저장
    const result = await saveUserToFirebase(userData);
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: '성공적으로 등록되었습니다.',
        data: result
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
    
  } catch (error) {
    console.error('사용자 등록 중 오류 발생:', error);
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: '사용자 등록 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}
