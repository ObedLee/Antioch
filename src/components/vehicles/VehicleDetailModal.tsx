'use client';

import { Vehicle } from '@/lib/firestore';
import { useEffect } from 'react';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (vehicleId: string) => void;
  onDelete?: (vehicleId: string) => void;
}

export default function VehicleDetailModal({ vehicle, isOpen, onClose, onEdit, onDelete }: VehicleDetailModalProps) {
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

  if (!vehicle || !isOpen) return null;

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
              차량 상세 정보
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
                    <label className="block text-sm font-medium text-blue-600">소유자 이름</label>
                    <p className="mt-1 text-sm text-gray-900">{vehicle.ownerName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-600">연락처</label>
                    <p className="mt-1 text-sm text-gray-900">{vehicle.phoneNumber || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-600">차종</label>
                    <p className="mt-1 text-sm text-gray-900">{vehicle.carType}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-600">차량번호</label>
                    <p className="mt-1 text-sm text-gray-900">{vehicle.carNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-600">소속</label>
                    <p className="mt-1 text-sm text-gray-900">{vehicle.department || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-600">예비 연락처</label>
                    <p className="mt-1 text-sm text-gray-900">{vehicle.secondaryPhoneNumber || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-600">비고</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{vehicle.notes || '-'}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <div className="flex space-x-2">
                    {onDelete && (
                      <button
                        type="button"
                        className="text-red-600 text-sm bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none hover:bg-transparent hover:text-red-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                        onClick={() => onDelete(vehicle!.id)}
                      >
                        삭제
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        className="text-blue-600 text-sm bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none hover:bg-transparent hover:text-blue-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                        onClick={() => onEdit(vehicle!.id)}
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
