import { NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

// 환경 변수 확인 로그
console.log('API 환경 변수 확인:', {
  hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  privateKeyLength: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length || 0,
  nodeEnv: process.env.NODE_ENV
});

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

export async function POST(request: Request) {
  try {
    console.log('API 요청 수신');
    
    if (!spreadsheetId) {
      console.error('스프레드시트 ID가 설정되지 않았습니다.');
      return NextResponse.json(
        { 
          success: false, 
          message: '서버 설정 오류가 발생했습니다.',
          debug: process.env.NODE_ENV === 'development' ? '스프레드시트 ID가 설정되지 않았습니다.' : undefined
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


    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
    console.log('스프레드시트 로드 시도...');
    
    try {
      await doc.loadInfo();
      console.log('스프레드시트 제목:', doc.title);
      
      const sheet = doc.sheetsByIndex[0];
      console.log('시트 제목:', sheet.title);

      try {
        await sheet.loadHeaderRow();
        console.log('시트 헤더 로드 완료');
      } catch (error) {
        console.log('시트에 헤더가 없거나 비어있습니다.');
        return NextResponse.json({ 
          success: true, 
          exists: false,
          debug: process.env.NODE_ENV === 'development' ? '시트에 헤더가 없거나 비어있습니다.' : undefined
        });
      }

      const rows = await sheet.getRows();
      console.log(`조회된 행 수: ${rows.length}`);
      
      const existingRow = rows.find(row => {
        const phoneNumber = row.get('휴대폰번호');
        const match = phoneNumber && phoneNumber.trim() === phone.trim();
        if (match) {
          console.log('일치하는 전화번호 찾음:', { 
            rowNumber: row.rowNumber,
            phoneNumber: phoneNumber.trim()
          });
        }
        return match;
      });

      if (existingRow) {
        const userData = {
          name: existingRow.get('이름'),
          phone: existingRow.get('휴대폰번호'),
          birthYear: existingRow.get('출생년도'),
          church: existingRow.get('교회'),
          rowNumber: existingRow.rowNumber
        };
        console.log('사용자 데이터 반환:', userData);
        
        return NextResponse.json({
          success: true,
          exists: true,
          data: userData,
          debug: process.env.NODE_ENV === 'development' ? {
            env: {
              hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
              hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
              nodeEnv: process.env.NODE_ENV
            }
          } : undefined
        });
      }

      console.log('일치하는 전화번호를 찾을 수 없음');
      return NextResponse.json({ 
        success: true, 
        exists: false,
        debug: process.env.NODE_ENV === 'development' ? '일치하는 전화번호를 찾을 수 없음' : undefined
      });
      
    } catch (error) {
      console.error('Google Sheets API 오류:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('API 처리 중 오류 발생:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '서버 오류가 발생했습니다.',
        ...(process.env.NODE_ENV === 'development' && {
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          stack: error instanceof Error ? error.stack : undefined
        })
      },
      { status: 500 }
    );
  }
}
