'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PasswordChangeModal from '@/components/auth/PasswordChangeModal';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [isFloatingTabOpen, setIsFloatingTabOpen] = useState(false);

  // Close dropdown and floating tab when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDropdownOpen && !target.closest('#user-menu') && !target.closest('[role="menu"]')) {
        setIsDropdownOpen(false);
      }
      if (isFloatingTabOpen && !target.closest('.floating-tab-container')) {
        setIsFloatingTabOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isFloatingTabOpen]);

  // 인증되지 않은 사용자 리디렉션
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // 로딩 상태 표시
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" showVerse={false} />
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      // AuthContext에서 이미 리다이렉트를 처리하므로 여기서는 제거
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };



  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/dashboard" className="flex items-center transition-colors">
                  <img 
                    src="/images/아이콘.png" 
                    alt="안디옥교회 아이콘" 
                    className="w-12 h-12 mr-3 object-contain"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">안디옥교회</span>
                    <span className="text-xl font-bold text-gray-900 -mt-1">데이터 관리 시스템</span>
                  </div>
                </Link>
              </div>
              
              {/* 탭 네비게이션 - 데스크톱에서만 표시 */}
              <div className="hidden md:flex ml-8 items-end h-full">
                <Link 
                  href="/dashboard/vehicles"
                  className={`border-b-2 px-4 h-full flex items-center text-base font-semibold transition-colors ${
                    pathname.startsWith('/dashboard/vehicles') 
                      ? 'border-blue-500 text-blue-600 hover:text-blue-800' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  차량관리
                </Link>
                <Link 
                  href="/dashboard/fruits"
                  className={`border-b-2 px-4 h-full flex items-center text-base font-semibold transition-colors ${
                    pathname.startsWith('/dashboard/fruits') 
                      ? 'border-blue-500 text-blue-600 hover:text-blue-800' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  열매관리
                </Link>
                {/* 추후 확장을 위한 예시 탭 */}
                {/* 
                <Link 
                  href="/dashboard/other"
                  className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-4 h-full flex items-center text-base font-semibold transition-colors"
                >
                  다른 데이터
                </Link>
                */}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="ml-6 flex items-center">
                <div className="ml-3 relative">
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="p-0 bg-transparent border-0 outline-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none focus:ring-transparent active:outline-none active:ring-0 active:border-0 hover:bg-transparent hover:shadow-none"
                      id="user-menu"
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="true"
                    >
                      <span className="sr-only">사용자 메뉴 열기</span>
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-base border-0 outline-0 shadow-none relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full pointer-events-none"></div>
                        <span className="relative z-10">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                      </div>
                    </button>
                  </div>
                  {isDropdownOpen && (
                    <div
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-xl py-2 bg-white focus:outline-none z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">사용자</p>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                      </div>
                      {/* 이메일/비밀번호 로그인 사용자에게만 비밀번호 변경 버튼 표시 */}
                      {user?.providerData?.some(provider => provider.providerId === 'password') && (
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsPasswordChangeModalOpen(true);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 bg-white hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 focus:outline-none focus:ring-0 focus:border-0 active:outline-none active:ring-0 active:border-0 active:scale-100 rounded-none"
                          role="menuitem"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m3 0a2 2 0 00-2-2M9 7h6m6 2a2 2 0 11-4 0 2 2 0 014 0zM9 7v4a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2z" />
                          </svg>
                          비밀번호 변경
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 bg-white hover:bg-red-50 hover:text-red-700 transition-colors duration-200 focus:outline-none focus:ring-0 focus:border-0 active:outline-none active:ring-0 active:border-0 active:scale-100 rounded-none"
                        role="menuitem"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10 flex-1">
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} 안디옥교회. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Password Change Modal */}
      <PasswordChangeModal 
        isOpen={isPasswordChangeModalOpen} 
        onClose={() => setIsPasswordChangeModalOpen(false)} 
      />
      
      {/* 모바일 플로팅 탭 네비게이션 */}
      <div className="md:hidden fixed bottom-4 left-4 z-50 floating-tab-container">
        {/* 플로팅 탭 메뉴 */}
        {isFloatingTabOpen && (
          <div className="absolute bottom-16 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px]">
            <Link 
              href="/dashboard/vehicles"
              className={`block px-4 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/dashboard/vehicles') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
              onClick={() => setIsFloatingTabOpen(false)}
            >
              차량관리
            </Link>
            <Link 
              href="/dashboard/fruits"
              className={`block px-4 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/dashboard/fruits') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
              onClick={() => setIsFloatingTabOpen(false)}
            >
              열매관리
            </Link>
          </div>
        )}
        
        {/* 플로팅 버튼 */}
        <button
          onClick={() => setIsFloatingTabOpen(!isFloatingTabOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#363636',
            color: '#fff',
            whiteSpace: 'nowrap',
            maxWidth: 'none',
          },
        }}
      />
    </div>
  );
}
