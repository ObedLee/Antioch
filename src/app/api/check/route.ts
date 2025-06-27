import { NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

export async function POST(request: Request) {
  try {
    if (!spreadsheetId) {
      throw new Error('스프레드시트 ID가 설정되지 않았습니다.');
    }

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: '휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    try {
      await sheet.loadHeaderRow();
    } catch (error) {
      // 헤더가 없는 경우 빈 결과 반환
      return NextResponse.json({ success: true, exists: false });
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(row => {
      const phoneNumber = row.get('휴대폰번호');
      return phoneNumber && phoneNumber.trim() === phone.trim();
    });

    if (existingRow) {
      return NextResponse.json({
        success: true,
        exists: true,
        data: {
          name: existingRow.get('이름'),
          phone: existingRow.get('휴대폰번호'),
          birthYear: existingRow.get('출생년도'),
          church: existingRow.get('교회'),
          rowNumber: existingRow.rowNumber
        }
      });
    }

    return NextResponse.json({ success: true, exists: false });
  } catch (error) {
    console.error('조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, message: '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
