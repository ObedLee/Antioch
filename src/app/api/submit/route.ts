import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 환경 변수에서 인증 정보 가져오기
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const apiKey = process.env.GOOGLE_API_KEY;
const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!spreadsheetId) {
  throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID가 설정되지 않았습니다.');
}

if (!apiKey) {
  throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.');
}

if (!clientEmail || !privateKey) {
  throw new Error('Google 서비스 계정 정보가 설정되지 않았습니다.');
}

// Google Sheets API 기본 URL
const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// API 키로 인증 헤더 생성 (읽기 전용)
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

// Google 인증 클라이언트 생성 (쓰기용)
const getAuthClient = async () => {
  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    await auth.authorize();
    return auth;
  } catch (error) {
    console.error('Google 인증 실패:', error);
    throw new Error('Google 인증에 실패했습니다.');
  }
};

// Google Sheets API 응답 타입 정의
interface SheetValues {
  values?: (string | number | boolean | null)[][] | null;
  range?: string;
}

// Google Sheets API v4 엔드포인트 - 읽기
const getSheetData = async (range: string): Promise<SheetValues> => {
  try {
    const response = await fetch(
      `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch sheet data');
    }

    const data = await response.json();
    return {
      values: data.values || [],
      range: data.range || ''
    };
  } catch (error) {
    console.error('Google Sheets API 호출 중 오류 발생:', error);
    throw new Error(`데이터를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 데이터 업데이트 함수
const updateSheetData = async (range: string, values: any[][]) => {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Google Sheets 업데이트 중 오류 발생:', error);
    throw new Error(`데이터를 업데이트하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 데이터 추가 함수
const appendSheetData = async (range: string, values: any[][]) => {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Google Sheets에 데이터 추가 중 오류 발생:', error);
    throw new Error(`데이터를 추가하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 시트 이름에서 작은따옴표 제거
const cleanSheetName = (name: string): string => {
  return name.replace(/'/g, '');
};

export async function POST(request: Request) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    const { name, phone, birthYear, church } = body;

    // 데이터 유효성 검사
    if (!name || !phone || !birthYear || !church) {
      return NextResponse.json({ success: false, message: '모든 필수 항목을 입력해주세요.' }, { status: 400 });
    }

    // 1. 첫 번째 시트의 첫 번째 행 가져오기 (시트 이름 확인을 위해)
    console.log('스프레드시트 정보를 가져오는 중...');
    // 첫 번째 행 가져오기 (헤더 행)
    const firstSheetData = await getSheetData('A1:Z1');
    if (!firstSheetData.range) {
      throw new Error('시트 범위를 가져올 수 없습니다.');
    }
    
    const urlParts = firstSheetData.range.split('!');
    if (urlParts.length === 0) {
      throw new Error('시트 이름을 추출할 수 없습니다.');
    }
    
    const sheetName = cleanSheetName(urlParts[0]);
    console.log('사용할 시트 이름:', sheetName);
    
    // 4. 기존 데이터 조회
    const range = `${sheetName}!A:E`; // A:제출일시, B:이름, C:휴대폰번호, D:출생년도, E:교회
    console.log('데이터 조회 범위:', range);
    
    let sheetData: SheetValues = { values: [] };
    
    try {
      sheetData = await getSheetData(range);
      
      // 헤더 행이 없는 경우 헤더 추가
      if (!sheetData.values || sheetData.values.length === 0) {
        await updateSheetData(
          `${sheetName}!A1:E1`,
          [['제출일시', '이름', '휴대폰번호', '출생년도', '교회']]
        );
        sheetData = { values: [] };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unable to parse range')) {
        // 헤더 행이 없는 경우 헤더 생성
        await updateSheetData(
          `${sheetName}!A1:E1`,
          [['제출일시', '이름', '휴대폰번호', '출생년도', '교회']]
        );
        sheetData = { values: [] };
      } else {
        console.error('시트 데이터를 가져오는 중 오류 발생:', error);
        throw new Error(`시트 데이터를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 5. 기존 등록 여부 확인
    const rows = sheetData.values || [];
    const headerRow = rows[0] || [];
    const dataRows = rows.length > 1 ? rows.slice(1) : [];
    
    // 헤더 행이 없는 경우 추가
    if (headerRow.length === 0 || 
        headerRow[0] !== '제출일시' || 
        headerRow[1] !== '이름' || 
        headerRow[2] !== '휴대폰번호' || 
        headerRow[3] !== '출생년도' || 
        headerRow[4] !== '교회') {
      await updateSheetData(
        `${sheetName}!A1:E1`,
        [['제출일시', '이름', '휴대폰번호', '출생년도', '교회']]
      );
    }
    
    // 6. 기존 전화번호 검색
    const phoneColumnIndex = 2; // C열 (0-based)
    const existingRowIndex = dataRows.findIndex(row => {
      const phoneValue = row[phoneColumnIndex];
      return phoneValue && String(phoneValue).trim() === phone.trim();
    });
    
    const currentTime = new Date().toLocaleString('ko-KR');
    const newRow: (string | number | boolean | null)[] = [currentTime, name, phone, birthYear, church];
    
    if (existingRowIndex >= 0) {
      // 7. 기존 행 업데이트
      const updateRange = `${sheetName}!A${existingRowIndex + 2}:E${existingRowIndex + 2}`; // +2 because of 1-based index and header row
      await updateSheetData(updateRange, [newRow]);
      
      return NextResponse.json({ 
        success: true, 
        message: '신청 정보가 수정되었습니다.',
        isUpdate: true
      });
    } else {
      // 8. 새 행 추가
      await appendSheetData(range, [newRow]);
      
      return NextResponse.json({ 
        success: true, 
        message: '신청이 완료되었습니다.',
        isUpdate: false
      });
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
