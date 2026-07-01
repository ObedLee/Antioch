'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { changePassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await changePassword(currentPassword, newPassword);
      
      if (result.success) {
        // 폼 초기화
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // 모달을 먼저 닫고 토스트 알림 표시
        onClose();
        
        // 모달이 닫힌 후 토스트 알림 표시
        setTimeout(() => {
          toast.success('🔒 비밀번호 변경 완료', {
            duration: 1500,
            position: 'top-center',
            style: {
              background: '#10B981',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              padding: '12px 20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              zIndex: 9999,
              whiteSpace: 'nowrap',
              maxWidth: 'none',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#10B981',
            },
          });
        }, 100);
      } else {
        toast.error(result.error || '비밀번호 변경 실패', {
          duration: 2000,
          position: 'top-center',
          style: {
            background: '#EF4444',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '14px',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            whiteSpace: 'nowrap',
            maxWidth: 'none',
          },
        });
      }
    } catch (error) {
      toast.error('⚠️ 비밀번호 변경 오류', {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#ffffff',
          fontWeight: '600',
          fontSize: '14px',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
          whiteSpace: 'nowrap',
          maxWidth: 'none',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m3 0a2 2 0 00-2-2M9 7h6m6 2a2 2 0 11-4 0 2 2 0 014 0zM9 7v4a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                비밀번호 변경
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  보안을 위해 현재 비밀번호를 입력한 후 새 비밀번호를 설정해주세요.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 sm:mt-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  현재 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  새 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="6자 이상 입력해주세요"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  새 비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="새 비밀번호를 다시 입력해주세요"
                />
              </div>
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-0 focus:border-0 active:outline-none active:ring-0 active:border-0 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm"
              >
                {isSubmitting ? '변경 중...' : '변경하기'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-0 focus:border-0 active:outline-none active:ring-0 active:border-0 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-1 sm:mt-0 sm:text-sm"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
