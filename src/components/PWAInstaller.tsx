'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

// iOS Safari의 standalone 속성을 위한 타입 확장
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Service Worker 등록
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // PWA 설치 가능 이벤트 감지
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // PWA 설치 완료 이벤트 감지
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('앱이 성공적으로 설치되었습니다!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS Safari에서 이미 홈 화면에 추가되었는지 확인
    if (window.navigator.standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // iOS Safari 사용자를 위한 수동 설치 안내
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const isInStandaloneMode = () => {
    return window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  };

  if (isInstalled || isInStandaloneMode()) {
    return null; // 이미 설치되었거나 앱 모드에서 실행 중
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      {isInstallable && (
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">앱으로 설치하기</h3>
            <p className="text-sm opacity-90">홈 화면에 추가하여 더 편리하게 사용하세요</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsInstallable(false)}
              className="px-3 py-1 text-sm bg-blue-500 rounded hover:bg-blue-400"
            >
              나중에
            </button>
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 text-sm bg-white text-blue-600 rounded hover:bg-gray-100 font-semibold"
            >
              설치
            </button>
          </div>
        </div>
      )}
      
      {isIOS() && !isInStandaloneMode() && (
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-2">iPhone에서 앱으로 설치하기</h3>
          <div className="text-sm space-y-1">
            <p>1. Safari 하단의 <span className="font-semibold">공유 버튼</span>을 탭하세요</p>
            <p>2. <span className="font-semibold">"홈 화면에 추가"</span>를 선택하세요</p>
            <p>3. <span className="font-semibold">"추가"</span>를 탭하여 완료하세요</p>
          </div>
          <button
            onClick={() => setIsInstallable(false)}
            className="mt-3 px-3 py-1 text-sm bg-gray-600 rounded hover:bg-gray-500"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
