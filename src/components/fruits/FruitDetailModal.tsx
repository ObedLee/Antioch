'use client';

import { Fruit } from '@/lib/firestore';
import { useEffect } from 'react';

interface FruitDetailModalProps {
  fruit: Fruit | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (fruitId: string) => void;
  onDelete?: (fruitId: string) => void;
}

export default function FruitDetailModal({ fruit, isOpen, onClose, onEdit, onDelete }: FruitDetailModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!fruit || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* 배경 오버레이 */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        {/* 모달 컨텐츠 */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              열매 상세 정보
            </h3>
            <button
              onClick={onClose}
              className="text-blue-600 bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none hover:bg-transparent hover:text-blue-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
                
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-600">영접자</label>
              <p className="mt-1 text-sm text-gray-900">{fruit.영접자}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">전도자</label>
              <p className="mt-1 text-sm text-gray-900">{fruit.전도자}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">구분</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  fruit.구분 === '재만남' ? 'bg-green-100 text-green-800' :
                  fruit.구분 === '말씀운동' ? 'bg-blue-100 text-blue-800' :
                  fruit.구분 === '영접' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {fruit.구분}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">만남날짜</label>
              <p className="mt-1 text-sm text-gray-900">{fruit.만남날짜 || '-'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">만남장소</label>
              <p className="mt-1 text-sm text-gray-900">{fruit.만남장소 || '-'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">만남횟수</label>
              <p className="mt-1 text-sm text-gray-900">{fruit.만남횟수 || '-'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">나이</label>
              <p className="mt-1 text-sm text-gray-900">{fruit.나이 || '-'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">연락처</label>
              <p className="mt-1 text-sm text-gray-900">{fruit.연락처 || '-'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-600">영적상태 (비고)</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{fruit.영적상태 || '-'}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="flex space-x-2">
              {onDelete && (
                <button
                  type="button"
                  className="text-red-600 text-sm bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none hover:bg-transparent hover:text-red-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                  onClick={() => onDelete(fruit!.id)}
                >
                  삭제
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  className="text-blue-600 text-sm bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none hover:bg-transparent hover:text-blue-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                  onClick={() => onEdit(fruit!.id)}
                >
                  수정
                </button>
              )}
              <button
                type="button"
                className="text-blue-600 text-sm bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none hover:bg-transparent hover:text-blue-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                onClick={() => {
                  onClose();
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
