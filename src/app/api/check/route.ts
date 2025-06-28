import { NextResponse } from 'next/server';

// 환경 변수 확인
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const apiKey = process.env.GOOGLE_API_KEY;

// 환경 변수 확인 로그 (디버깅용)
console.log('API 환경 변수 확인:', {
  hasApiKey: !!apiKey,
  hasSpreadsheetId: !!spreadsheetId,
  nodeEnv: process.env.NODE_ENV
});

// Google Sheets API v4 엔드포인트
const getSheetData = async (range: string) => {
  if (!spreadsheetId || !apiKey) {
    throw new Error('스프레드시트 ID 또는 API 키가 설정되지 않았습니다.');
  }

  // range가 빈 문자열이면 시트 정보만 가져옵니다.
  const endpoint = range 
    ? `values/${encodeURIComponent(range)}`
    : '';
    
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${endpoint ? `/${endpoint}` : ''}?key=${apiKey}`;
  console.log('Google Sheets API 호출:', url);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API 오류:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: errorText
      });
      throw new Error(`Google Sheets API 오류: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Google Sheets API 응답:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Google Sheets API 호출 중 오류 발생:', error);
    throw new Error(`Google Sheets API 호출 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export async function POST(request: Request) {
  try {
    console.log('API 요청 수신');
    
    if (!spreadsheetId || !apiKey) {
      console.error('필수 환경 변수가 설정되지 않았습니다.');
      return NextResponse.json(
        { 
          success: false, 
          message: '서버 설정 오류가 발생했습니다.',
          debug: process.env.NODE_ENV === 'development' ? '필수 환경 변수가 설정되지 않았습니다.' : undefined
        },
        { status: 500 }
      );
    }

    const { phone } = await request.json();
    console.log('요청 데이터:', { phone });

    if (!phone) {
      return NextResponse.json(
        { success: false, message: '휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. 스프레드시트 정보 가져오기
    console.log('스프레드시트 정보를 가져오는 중...');
    const spreadsheetInfo = await getSheetData('');
    
    // 2. 시트 이름 확인
    if (!spreadsheetInfo.sheets || spreadsheetInfo.sheets.length === 0) {
      throw new Error('사용 가능한 시트를 찾을 수 없습니다.');
    }
    
    // 3. 첫 번째 시트의 이름 가져오기
    const firstSheet = spreadsheetInfo.sheets[0];
    const sheetName = firstSheet.properties?.title;
    
    if (!sheetName) {
      throw new Error('시트 이름을 확인할 수 없습니다.');
    }
    
    console.log('사용할 시트 이름:', sheetName);
    
    // 4. 시트 데이터 조회 (A:E 열: 이름, 휴대폰번호, 출생년도, 교회)
    const range = `${sheetName}!A:E`;
    console.log('데이터 조회 범위:', range);
    const data = await getSheetData(range);
    
    if (!data.values || data.values.length === 0) {
      console.log('시트에 데이터가 없습니다.');
      return NextResponse.json({ 
        success: true, 
        exists: false,
        debug: process.env.NODE_ENV === 'development' ? '시트에 데이터가 없습니다.' : undefined
      });
    }
    
    // 헤더 행 찾기
    const headers = data.values[0].map((header: string) => header.trim());
    const rows = data.values.slice(1);
    
    // 컬럼 인덱스 찾기
    const phoneIndex = headers.indexOf('휴대폰번호');
    const nameIndex = headers.indexOf('이름');
    const birthYearIndex = headers.indexOf('출생년도');
    const churchIndex = headers.indexOf('교회');
    
    if (phoneIndex === -1) {
      console.error('시트에 휴대폰번호 컬럼을 찾을 수 없습니다.');
      return NextResponse.json({
        success: false,
        message: '서버 설정 오류가 발생했습니다.',
        debug: process.env.NODE_ENV === 'development' ? '시트에 휴대폰번호 컬럼을 찾을 수 없습니다.' : undefined
      }, { status: 500 });
    }
    
    // 휴대폰 번호로 검색 (공백 제거 후 비교)
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const existingRow = rows.find((row: string[]) => {
      const rowPhone = (row[phoneIndex] || '').toString().trim().replace(/\s+/g, '');
      return rowPhone === cleanPhone;
    });
    
    if (existingRow) {
      const userData = {
        name: (existingRow[nameIndex] || '').toString().trim(),
        phone: (existingRow[phoneIndex] || '').toString().trim(),
        birthYear: (existingRow[birthYearIndex] || '').toString().trim(),
        church: (existingRow[churchIndex] || '').toString().trim(),
      };
      
      console.log('사용자 데이터 반환:', userData);
      
      return NextResponse.json({
        success: true,
        exists: true,
        data: userData,
        debug: process.env.NODE_ENV === 'development' ? {
          headers,
          foundAt: rows.indexOf(existingRow) + 2 // +2 for 1-based index and header row
        } : undefined
      });
    }
    
    // 일치하는 데이터가 없는 경우
    return NextResponse.json({
      success: true,
      exists: false,
      debug: process.env.NODE_ENV === 'development' ? {
        message: 'No matching phone number found',
        searchedPhone: cleanPhone,
        headers,
        totalRows: rows.length
      } : undefined
    });
    
  } catch (error: unknown) {
    console.error('API 처리 중 오류 발생:', error);
    const errorResponse: {
      success: boolean;
      message: string;
      error?: string;
      stack?: string;
    } = { 
      success: false, 
      message: '서버 오류가 발생했습니다.'
    };

    if (process.env.NODE_ENV === 'development') {
      if (error instanceof Error) {
        errorResponse.error = error.message;
        errorResponse.stack = error.stack;
      } else {
        errorResponse.error = '알 수 없는 오류';
      }
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
