'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// 단순화된 인증 상태 관리
const AUTH_READY_KEY = 'antioch-auth-ready';
const IS_DEV = process.env.NODE_ENV === 'development';

// 브라우저 환경 감지 유틸리티
const getBrowserInfo = () => {
  if (typeof window === 'undefined') return { isKakaoTalk: false, isMobile: false };
  const userAgent = navigator.userAgent;
  return {
    isKakaoTalk: /KAKAOTALK/i.test(userAgent),
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  };
};

// 단일 인증 상태 확인
const getAuthReady = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(AUTH_READY_KEY) === 'true';
};

const setAuthReady = (value: boolean) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUTH_READY_KEY, value.toString());
};

// 공통 세션 토큰 설정 함수
const setSessionToken = async (user: User): Promise<void> => {
  try {
    const idToken = await user.getIdToken();
    const sessionResponse = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    
    if (!sessionResponse.ok) {
      if (IS_DEV) console.error('세션 설정 실패:', sessionResponse.status);
    } else {
      if (IS_DEV) console.log('세션 토큰 설정 완료');
    }
  } catch (error) {
    if (IS_DEV) console.error('세션 토큰 설정 오류:', error);
    // 세션 설정 실패해도 로그인 진행
  }
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 브라우저 정보 캐시 (중복 호출 방지)
  const browserInfo = getBrowserInfo();
  const isRedirectBrowser = browserInfo.isKakaoTalk || browserInfo.isMobile;

  // Firebase Auth persistence 설정 (IndexedDB 문제 해결)
  useEffect(() => {
    const setupPersistence = async () => {
      if (!auth) return;
      
      try {
        // 우선순위: Local > Session > Memory
        await setPersistence(auth, browserLocalPersistence);
        if (IS_DEV) console.log('[AuthContext] Local persistence 설정 성공');
      } catch (localError) {
        if (IS_DEV) console.warn('[AuthContext] Local persistence 실패, Session 시도:', localError);
        try {
          await setPersistence(auth, browserSessionPersistence);
          if (IS_DEV) console.log('[AuthContext] Session persistence 설정 성공');
        } catch (sessionError) {
          if (IS_DEV) console.warn('[AuthContext] Session persistence 실패, Memory 사용:', sessionError);
          try {
            await setPersistence(auth, inMemoryPersistence);
            if (IS_DEV) console.log('[AuthContext] Memory persistence 설정 성공');
          } catch (memoryError) {
            if (IS_DEV) console.error('[AuthContext] 모든 persistence 설정 실패:', memoryError);
          }
        }
      }
    };
    
    setupPersistence();
  }, []);

  // 최적화된 인증 상태 관리
  useEffect(() => {
    if (!auth) {
      if (IS_DEV) console.log('[AuthContext] Firebase auth 없음, 로딩 종료');
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    // 단일 타임아웃으로 단순화 (3초)
    const authTimeout = setTimeout(() => {
      if (isMounted) {
        if (IS_DEV) console.log('[AuthContext] 인증 타임아웃, 강제 종료');
        setLoading(false);
      }
    }, 3000);
    
    // 리다이렉트 결과 확인 (모바일 브라우저 대응)
    const checkRedirectResult = async () => {
      try {
        if (IS_DEV) console.log('[AuthContext] 리다이렉트 결과 확인 시작');
        
        const { getRedirectResult } = await import('firebase/auth');
        const result = await getRedirectResult(auth);
        
        if (IS_DEV) console.log('[AuthContext] getRedirectResult 결과:', {
          hasResult: !!result,
          hasUser: !!result?.user,
          email: result?.user?.email || 'null'
        });
        
        if (result?.user) {
          if (IS_DEV) console.log('[AuthContext] 리다이렉트 로그인 성공:', result.user.email);
          
          // onAuthStateChanged가 호출되지 않을 경우를 대비해 직접 상태 업데이트
          if (IS_DEV) console.log('[AuthContext] 리다이렉트 결과로 상태 직접 업데이트');
          setUser(result.user);
          setLoading(false);
          
          // 세션 토큰 설정
          try {
            if (IS_DEV) console.log('[AuthContext] 리다이렉트 로그인 세션 토큰 설정 시도');
            await setSessionToken(result.user);
            if (IS_DEV) console.log('[AuthContext] 리다이렉트 로그인 세션 설정 완료');
          } catch (sessionError) {
            if (IS_DEV) console.error('[AuthContext] 리다이렉트 로그인 세션 설정 실패:', sessionError);
          }
        } else {
          if (IS_DEV) console.log('[AuthContext] 리다이렉트 결과 없음 - 일반 로그인 또는 리다이렉트 전');
        }
      } catch (error) {
        if (IS_DEV) console.error('[AuthContext] 리다이렉트 결과 확인 오류:', error);
      }
    };
    
    // 모바일 브라우저에서 리다이렉트 결과 확인 (우선 처리)
    const { isKakaoTalk, isMobile } = getBrowserInfo();
    if (isKakaoTalk || isMobile) {
      if (IS_DEV) console.log('[AuthContext] 모바일 브라우저 감지, 리다이렉트 결과 확인 실행');
      checkRedirectResult();
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        if (IS_DEV) console.log('[AuthContext] 컴포넌트 언마운트됨, onAuthStateChanged 무시');
        return;
      }
      
      if (IS_DEV) console.log('[AuthContext] onAuthStateChanged 호출:', {
        user: user ? `${user.email} (${user.uid})` : 'null',
        loading: loading,
        timestamp: new Date().toISOString()
      });
      
      clearTimeout(authTimeout);
      
      // 단순화된 초기화 로직
      if (!getAuthReady()) {
        setAuthReady(true);
        if (IS_DEV) console.log('[AuthContext] 인증 상태 초기화 완료');
      }
      
      // 사용자 상태 업데이트
      setUser(user);
      setLoading(false);
      
      // 로그인 상태일 때 세션 쿠키 동기화 (미들웨어와 클라이언트 상태 일치)
      if (user) {
        try {
          if (IS_DEV) console.log('[AuthContext] 세션 토큰 동기화 시도');
          await setSessionToken(user);
          if (IS_DEV) console.log('[AuthContext] 세션 토큰 동기화 완료');
        } catch (error) {
          if (IS_DEV) console.error('[AuthContext] 세션 토큰 동기화 실패:', error);
        }
      }
      
      if (IS_DEV) console.log('[AuthContext] 상태 업데이트 완료:', {
        user: user ? user.email : 'null',
        loading: false
      });
    });
    
    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      const errorMsg = 'Firebase 인증 서비스를 사용할 수 없습니다.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    try {
      if (IS_DEV) console.log('[Email Login] 이메일 로그인 시작:', email);
      
      // 입력값 검증
      if (!email?.includes('@')) {
        const errorMsg = '유효한 이메일 주소를 입력해주세요.';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (!password || password.length < 6) {
        const errorMsg = '비밀번호는 6자 이상이어야 합니다.';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential?.user) {
        throw new Error('사용자 정보를 가져오지 못했습니다.');
      }
      
      if (IS_DEV) console.log('[Email Login] 이메일 로그인 성공:', userCredential.user.email);
      
      // 세션 토큰 설정
      try {
        await setSessionToken(userCredential.user);
        if (IS_DEV) console.log('[Email Login] 세션 토큰 설정 완료');
      } catch (sessionError) {
        if (IS_DEV) console.error('[Email Login] 세션 토큰 설정 실패:', sessionError);
        // 세션 설정 실패해도 로그인은 성공으로 처리 (상태는 onAuthStateChanged에서 업데이트됨)
      }
      
      return { success: true };
    } catch (firebaseError: any) {
      if (IS_DEV) console.error('[Email Login] 이메일 로그인 오류:', firebaseError);
      
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      
      // IndexedDB 또는 저장소 문제 처리
      if (
        firebaseError.message?.includes('indexedDB') ||
        firebaseError.message?.includes('Internal error opening backing store') ||
        firebaseError.code === 'auth/web-storage-unsupported'
      ) {
        errorMessage = '브라우저 저장소 문제로 로그인에 실패했습니다. 브라우저 설정을 확인해주세요.';
        if (IS_DEV) console.error('[Email Login] 저장소 문제 감지:', firebaseError.message);
      } else {
        switch (firebaseError.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
            errorMessage = '이메일 또는 비밀번호가 일치하지 않습니다.';
            break;
          case 'auth/user-not-found':
            errorMessage = '등록되지 않은 이메일 주소입니다.';
            break;
          case 'auth/too-many-requests':
            errorMessage = '너무 많은 로그인 시도가 있었습니다. 나중에 다시 시도해주세요.';
            break;
          case 'auth/network-request-failed':
            errorMessage = '네트워크 연결에 실패했습니다.';
            break;
        }
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      const errorMsg = 'Firebase 인증 서비스를 사용할 수 없습니다.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      if (IS_DEV) console.log('[Google Login] 구글 로그인 시작');
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      let result;
      
      // 데스크톱/모바일 모두 팝업 방식 우선 시도 (오류 시 리다이렉트로 폴백)
      if (IS_DEV) console.log('[Google Login] 팝업 방식 시도');
      
      try {
        result = await signInWithPopup(auth, provider);
        
        if (!result?.user) {
          throw new Error('구글 로그인에 실패했습니다.');
        }
        
        // 팝업 로그인 성공 시 세션 토큰 설정
        await setSessionToken(result.user);
        
      } catch (popupError: any) {
        if (IS_DEV) console.log('[Google Login] 팝업 오류:', popupError.code, popupError.message);
        
        // 팝업 차단, COOP 오류, 사용자 취소, 저장소 문제 시 리다이렉트로 폴백
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/cancelled-popup-request' ||
          popupError.code === 'auth/internal-error' ||
          popupError.message?.includes('Cross-Origin-Opener-Policy') ||
          popupError.message?.includes('indexedDB') ||
          popupError.message?.includes('null')
        ) {
          if (IS_DEV) console.log('[Google Login] 리다이렉트로 폴백');
          
          const { signInWithRedirect } = await import('firebase/auth');
          await signInWithRedirect(auth, provider);
          return { success: true };
        }
        
        // 사용자가 팝업을 닫은 경우 조용히 처리
        if (popupError.code === 'auth/popup-closed-by-user') {
          return { success: false, error: '로그인이 취소되었습니다.' };
        }
        
        // 기타 오류는 다시 던지기
        throw popupError;
      }

      if (IS_DEV) console.log('[Google Login] 구글 로그인 성공');
      return { success: true };
    } catch (error: any) {
      if (IS_DEV) console.error('[Google Login] 오류:', error.code, error.message);
      
      let errorMessage = '구글 로그인 중 오류가 발생했습니다.';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
        case 'auth/redirect-cancelled-by-user':
          errorMessage = '로그인이 취소되었습니다.';
          break;
        case 'auth/popup-blocked':
          errorMessage = '팝업이 차단되었습니다. 페이지를 새로고침 후 다시 시도해주세요.';
          break;
        case 'auth/cancelled-popup-request':
          return { success: false, error: '로그인이 이미 진행 중입니다.' };
        case 'auth/network-request-failed':
          errorMessage = '네트워크 연결을 확인해주세요.';
          break;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    if (!auth) {
      console.error('Firebase 인증 서비스를 사용할 수 없습니다.');
      window.location.href = '/';
      return;
    }
    
    try {
      // 1. sessionStorage 정리 (단순화)
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        if (IS_DEV) console.log('sessionStorage 정리 완료');
      }
      
      // 2. 세션 쿠키 삭제 (API 호출) - 동기적 처리
      try {
        await fetch('/api/auth/session', {
          method: 'DELETE',
        });
        if (IS_DEV) console.log('세션 쿠키 삭제 완료');
      } catch (sessionError) {
        if (IS_DEV) console.error('세션 쿠키 삭제 실패:', sessionError);
        // 세션 삭제 실패해도 로그아웃 진행
      }
      
      // 3. Firebase 인증 해제
      await firebaseSignOut(auth);
      
      // 4. 상태 초기화
      setUser(null);
      setLoading(false);
      
      // 5. 직접 첫 페이지로 이동 (로그인 페이지 거치지 않음)
      window.location.replace('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      // 오류 발생 시도 상태 초기화 후 첫 페이지로 이동
      setUser(null);
      setLoading(false);
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
      window.location.replace('/');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    try {
      // 현재 비밀번호로 재인증
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // 새 비밀번호로 업데이트
      await updatePassword(user, newPassword);
      
      return { success: true };
    } catch (error: any) {
      let errorMessage = '비밀번호 변경 실패';
      
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = '현재 비밀번호가 틀렸습니다';
          break;
        case 'auth/weak-password':
          errorMessage = '비밀번호는 6자 이상이어야 합니다';
          break;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    changePassword,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="xl" showVerse={true} />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용해야 합니다.');
  }
  return context;
}
