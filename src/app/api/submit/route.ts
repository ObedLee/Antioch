import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import type { JWTInput } from 'google-auth-library';

// 환경 변수에서 인증 정보 가져오기
const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '';
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

// 개인 키에서 이스케이프된 개행 문자 처리
const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || '';
const private_key = privateKey.replace(/\\\\n/g, '\\n');

// 환경 변수 검증
if (!private_key) {
  console.error('GOOGLE_SHEETS_PRIVATE_KEY가 설정되지 않았습니다.');
  throw new Error('GOOGLE_SHEETS_PRIVATE_KEY가 설정되지 않았습니다.');
}
if (!client_email) {
  console.error('GOOGLE_SHEETS_CLIENT_EMAIL이 설정되지 않았습니다.');
  throw new Error('GOOGLE_SHEETS_CLIENT_EMAIL이 설정되지 않았습니다.');
}
if (!spreadsheetId) {
  console.error('GOOGLE_SHEETS_SPREADSHEET_ID가 설정되지 않았습니다.');
  throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID가 설정되지 않았습니다.');
}

// Google Auth 클라이언트 초기화
const serviceAccountAuth = new JWT({
  email: client_email,
  key: private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

export async function POST(request: Request) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    const { name, phone, birthYear, church } = body;

    // 데이터 유효성 검사
    if (!name || !phone || !birthYear || !church) {
      return NextResponse.json({ success: false, message: '모든 필수 항목을 입력해주세요.' }, { status: 400 });
    }

    // Google 스프레드시트에 연결
    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByIndex[0];

    // 헤더 행이 없는 경우에만 설정
    try {
      await sheet.loadHeaderRow();
    } catch (error) {
      // 헤더 행이 없는 경우에만 실행
      await sheet.setHeaderRow(['제출일시', '이름', '휴대폰번호', '출생년도', '교회']);
    }

    // 기존 등록 여부 확인 및 업데이트
    try {
      const rows = await sheet.getRows();
      const existingRow = rows.find(row => {
        const phoneNumber = row.get('휴대폰번호');
        return phoneNumber && phoneNumber.trim() === phone.trim();
      });

      if (existingRow) {
        // 기존 행 업데이트
        existingRow.assign({
          '이름': name,
          '휴대폰번호': phone,
          '출생년도': birthYear,
          '교회': church,
          '제출일시': new Date().toLocaleString('ko-KR')
        });
        await existingRow.save();
        
        return NextResponse.json({ 
          success: true, 
          message: '신청 정보가 수정되었습니다.',
          isUpdate: true
        });
      }
    } catch (error) {
      console.error('기존 등록 확인 중 오류 발생:', error);
      // 오류가 발생하더라도 새로 등록 시도
    }

    // 데이터 추가
    await sheet.addRow({
      '제출일시': new Date().toLocaleString('ko-KR'),
      '이름': name,
      '휴대폰번호': phone,
      '출생년도': birthYear,
      '교회': church,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
