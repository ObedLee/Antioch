'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, loading: authLoading, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Handle redirect after successful login
  useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    
    console.log('[LoginPage] useEffect 실행:', { 
      user: user ? `${user.email} (${user.uid})` : 'null', 
      authLoading, 
      pathname: window.location.pathname,
      search: window.location.search
    });
    
    // 중복 리다이렉트 방지를 위한 플래그
    let redirectInProgress = false;
    
    const handleAuthChange = () => {
      if (user && !redirectInProgress) {
        console.log('[LoginPage] 인증된 사용자 감지:', user.email);
        
        // 이미 리다이렉트가 진행 중이면 중단
        if (redirectInProgress) {
          console.log('[LoginPage] 리다이렉트 이미 진행 중, 건너뛰기');
          return;
        }
        
        redirectInProgress = true;
        
        // Get redirect path from URL or use dashboard as default
        const searchParams = new URLSearchParams(window.location.search);
        let from = searchParams.get('from');
        
        console.log('[LoginPage] from 파라미터:', from);
        
        // Validate the redirect path
        if (!from || from === '/login' || from === '/') {
          from = '/dashboard';
          console.log('[LoginPage] from 재설정:', from);
        }
        
        // Only redirect if we're not already on the target path
        if (window.location.pathname !== from) {
          console.log(`[LoginPage] 리디렉트 실행: ${from}`);
          
          // 단일 리다이렉트 전략으로 변경 (중복 방지)
          router.replace(from);
          
          // 백업 리다이렉트 (더 긴 지연시간으로 설정)
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('[LoginPage] 백업 리다이렉트 실행');
              window.location.href = from;
            }
          }, 1000);
        } else {
          console.log('[LoginPage] 이미 대상 경로에 있음, 리디렉트 건너뛰');
          redirectInProgress = false;
        }
      } else {
        console.log('[LoginPage] 사용자가 인증되지 않음, 리디렉트 건너뛰');
      }
    };
    
    // Initial check
    handleAuthChange();
    
    // storage 이벤트 리스너 제거 (중복 리다이렉트 원인)
    // console.log('[LoginPage] storage 이벤트 리스너 등록');
    // window.addEventListener('storage', handleAuthChange);
    
    // Cleanup
    return () => {
      redirectInProgress = false;
      // console.log('[LoginPage] storage 이벤트 리스너 제거');
      // window.removeEventListener('storage', handleAuthChange);
    };
  }, [user, authLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // 입력값 트리밍
    const email = data.email.trim();
    const password = data.password.trim();
    
    console.log('로그인 시도:', email);
    
    // 로딩 토스트 표시
    const loadingToast = toast.loading('로그인 중...', {
      position: 'top-center',
    });
    
    try {
      const result = await signIn(email, password);
      console.log('로그인 결과:', result);
      
      if (!result?.success) {
        // 이미 AuthContext에서 에러 토스트가 표시됨
        toast.dismiss(loadingToast);
        return;
      }
      
      // 로그인 성공 시 로딩 토스트만 제거 (성공 메시지는 AuthContext에서 처리)
      toast.dismiss(loadingToast);
      toast.success('로그인 성공! 잠시만 기다려주세요...', {
        position: 'top-center',
        duration: 2000
      });
      
      // 로그인 성공 시 상태 업데이트 후 useEffect에서 리다이렉트 처리
      // 추가 대기 시간을 두어 인증 상태 동기화 보장
      setTimeout(() => {
        // 리다이렉트가 실패할 경우를 대비한 강제 새로고침
        const searchParams = new URLSearchParams(window.location.search);
        const from = searchParams.get('from') || '/dashboard';
        window.location.href = from;
      }, 1000);
      
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('로그인 처리 중 오류 발생:', error);
      
      // 이미 AuthContext에서 대부분의 에러를 처리하지만, 추가적인 에러 처리
      if (error.code === 'auth/too-many-requests') {
        toast.error('너무 많은 시도가 있었습니다. 나중에 다시 시도해주세요.', {
          duration: 5000,
          position: 'top-center',
        });
      } else if (error.message) {
        toast.error(`로그인 중 오류가 발생했습니다: ${error.message}`, {
          duration: 5000,
          position: 'top-center',
        });
      } else {
        toast.error('알 수 없는 오류가 발생했습니다. 나중에 다시 시도해주세요.', {
          duration: 5000,
          position: 'top-center',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // 로딩 토스트 표시
    const loadingToast = toast.loading('구글 로그인 중...', {
      position: 'top-center',
    });
    
    try {
      const result = await signInWithGoogle();
      
      if (!result.success) {
        toast.dismiss(loadingToast);
        return;
      }
      
      toast.success('구글 로그인 성공! 잠시만 기다려주세요...', {
        id: loadingToast,
        duration: 2000,
        position: 'top-center',
      });
      
      // 구글 로그인 성공 시 강제 리다이렉트
      setTimeout(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const from = searchParams.get('from') || '/dashboard';
        window.location.href = from;
      }, 1000);
      
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('구글 로그인 처리 중 오류 발생:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Toaster container at the root of the component
  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <img 
                src="/images/아이콘.png" 
                alt="안디옥교회 아이콘" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-blue-600 mb-2">
              안디옥교회
            </h1>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              데이터 관리 시스템
            </h2>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            관리자 계정으로 로그인하세요
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일 주소
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="이메일 주소"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isSubmitting ? '로그인 중...' : '이메일로 로그인'}
            </button>
          </div>
        </form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 로그인
          </button>
        </div>

        {/* 돌아가기 버튼 */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            돌아가기
          </Link>
        </div>

      </div>
      </div>
    </>
  );
}
