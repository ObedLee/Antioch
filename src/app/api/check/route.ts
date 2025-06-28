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

// Firebase Functions를 통해 사용자 확인
const checkUserInFirebase = async (phoneNumber: string) => {
  try {
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Firebase Functions 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Firebase Functions 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Firebase Functions 응답:', data);
    return data;
  } catch (error) {
    console.error('Firebase Functions 호출 중 오류 발생:', error);
    throw new Error(`Firebase Functions 호출 실패: ${error instanceof Error ? error.message : String(error)}`);
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

  console.log('POST /api/check 요청 수신');
  
  try {
    // 요청 본문 파싱
    let body;
    try {
      body = await request.json();
      console.log('요청 본문 파싱 성공:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('요청 본문 파싱 실패:', error);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: '유효하지 않은 JSON 형식입니다.'
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
    
    // 전화번호 파라미터 추출 (다양한 파라미터 이름 지원)
    const requestData = body as Record<string, any>;
    const phoneNumber = requestData.phone || requestData.phoneNumber || 
                      requestData.tel || requestData.number || requestData.value;
    
    console.log('추출된 전화번호:', phoneNumber);
    console.log('요청 데이터:', JSON.stringify(requestData));
    
    // 전화번호 검증
    if (!phoneNumber) {
      const errorMessage = '전화번호가 제공되지 않았습니다.';
      console.error(errorMessage, { receivedBody: body });
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          receivedData: body,
          availableFields: Object.keys(body || {})
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
    
    // 전화번호 포맷 정규화 (하이픈 제거)
    const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    // Firebase Functions를 통해 사용자 확인
    const checkUrl = `${FIREBASE_FUNCTIONS_URL}/check`;
    console.log('Firebase Functions 호출 중...', checkUrl);
    console.log('전화번호:', normalizedPhone);
    
    const requestPayload = { 
      phone: normalizedPhone,
      phoneNumber: normalizedPhone // 호환성을 위해 두 가지 형식 모두 전송
    };
    
    console.log('Firebase Functions 요청 본문:', JSON.stringify(requestPayload, null, 2));
    
    const response = await fetch(checkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
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
      
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: '사용자 조회 중 오류가 발생했습니다.',
          details: errorData
        }),
        { 
          status: 200, // 클라이언트에서 처리할 수 있도록 항상 200 반환
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    let result;
    try {
      result = await response.json();
      console.log('Firebase Functions 응답:', result);
    } catch (error) {
      console.error('JSON 파싱 오류:', error);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: '서버 응답을 처리하는 중 오류가 발생했습니다.'
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    // 사용자 정보가 있는 경우
    if (result.success && result.data) {
      return new NextResponse(
        JSON.stringify({ 
          success: true,
          data: result.data
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  } catch (error) {
    console.error('API 처리 중 오류 발생:', error);
    
    // 오류 유형에 따라 적절한 상태 코드 설정
    let statusCode = 500;
    let errorMessage = '서버 오류가 발생했습니다.';
    
    if (error instanceof Error) {
      const errorMessageLower = error.message.toLowerCase();
      if (errorMessageLower.includes('firebase functions')) {
        statusCode = 502; // Bad Gateway
        errorMessage = '백엔드 서비스에 연결할 수 없습니다.';
      } else if (errorMessageLower.includes('전화번호')) {
        statusCode = 400; // Bad Request
        errorMessage = '유효하지 않은 요청입니다.';
      }
    }
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}
