import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      hasApiKey: !!process.env.GOOGLE_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      // Don't expose actual values in production
      ...(process.env.NODE_ENV === 'development' && {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        apiKey: process.env.GOOGLE_API_KEY ? '***' : undefined
      })
    }
  });
}
