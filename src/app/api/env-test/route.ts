import { NextResponse } from 'next/server';

// This route is only available in development mode
// It will return 404 in production builds
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not found', { status: 404 });
  }

  return NextResponse.json({
    env: {
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      hasApiKey: !!process.env.GOOGLE_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      // Only expose actual values in development
      ...(process.env.NODE_ENV === 'development' && {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        // Mask the API key even in development
        apiKey: process.env.GOOGLE_API_KEY ? '***' + process.env.GOOGLE_API_KEY.slice(-4) : undefined
      })
    }
  });
}
