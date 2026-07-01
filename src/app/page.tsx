'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" showVerse={true} />
      </div>
    );
  }

  // If user is logged in, show loading (will redirect)
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" showVerse={false} />
      </div>
    );
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
            데이터 관리 시스템
          </h2>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            {/* 차량등록 버튼 */}
            <Link
              href="/register/vehicle"
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11C5.84 5 5.28 5.42 5.08 6.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-1.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              차량등록
            </Link>

            {/* 열매등록 버튼 */}
            <Link
              href="/register/fruit"
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              열매등록
            </Link>

            {/* 관리자로그인 버튼 */}
            <Link
              href="/login"
              className="w-full flex justify-center items-center py-4 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              관리자로그인
            </Link>
          </div>

          <div className="mt-6">
            <p className="text-center text-sm text-gray-500">
              차량이나 열매를 등록하시려면 위 버튼을 클릭하세요
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              관리자는 로그인 후 데이터를 관리할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
