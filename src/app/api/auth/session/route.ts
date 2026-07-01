import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' }, 
        { status: 400 }
      );
    }

    console.log('[Session API] ID 토큰 받음, 세션 쿠키 설정 중...');
    
    // Create response with session cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('__session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/'
    });

    console.log('[Session API] 세션 쿠키 설정 완료');
    
    return response;
  } catch (error) {
    console.error('[Session API] 세션 설정 오류:', error);
    return NextResponse.json(
      { error: 'Failed to set session' }, 
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('[Session API] 세션 쿠키 삭제 중...');
    
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('__session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    });
    
    console.log('[Session API] 세션 쿠키 삭제 완료');
    
    return response;
  } catch (error) {
    console.error('[Session API] 세션 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' }, 
      { status: 500 }
    );
  }
}
