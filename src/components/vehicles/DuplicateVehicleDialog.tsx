'use client';

import { Vehicle } from '@/lib/firestore';

interface DuplicateVehicleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingVehicle: Vehicle;
  newVehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;
  onUpdate: () => void;
  onCancel: () => void;
}

export default function DuplicateVehicleDialog({
  isOpen,
  onClose,
  existingVehicle,
  newVehicleData,
  onUpdate,
  onCancel,
}: DuplicateVehicleDialogProps) {
  if (!isOpen) return null;

  // 변경된 필드 확인
  const getChangedFields = () => {
    const changes: { field: string; label: string; old: string; new: string }[] = [];
    
    if (existingVehicle.ownerName !== newVehicleData.ownerName) {
      changes.push({
        field: 'ownerName',
        label: '소유자',
        old: existingVehicle.ownerName,
        new: newVehicleData.ownerName,
      });
    }
    
    if (existingVehicle.carType !== newVehicleData.carType) {
      changes.push({
        field: 'carType',
        label: '차종',
        old: existingVehicle.carType,
        new: newVehicleData.carType,
      });
    }
    
    if (existingVehicle.department !== newVehicleData.department) {
      changes.push({
        field: 'department',
        label: '소속',
        old: existingVehicle.department || '',
        new: newVehicleData.department || '',
      });
    }
    
    if (existingVehicle.secondaryPhoneNumber !== newVehicleData.secondaryPhoneNumber) {
      changes.push({
        field: 'secondaryPhoneNumber',
        label: '예비연락처',
        old: existingVehicle.secondaryPhoneNumber || '',
        new: newVehicleData.secondaryPhoneNumber || '',
      });
    }
    
    if (existingVehicle.notes !== newVehicleData.notes) {
      changes.push({
        field: 'notes',
        label: '비고',
        old: existingVehicle.notes || '',
        new: newVehicleData.notes || '',
      });
    }
    
    return changes;
  };

  const changedFields = getChangedFields();
  const hasChanges = changedFields.length > 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* 헤더 */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
            중복 차량 정보 발견
          </h3>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>연락처:</strong> {existingVehicle.phoneNumber} <br />
              <strong>차량번호:</strong> {existingVehicle.carNumber}
            </p>
            <p className="text-sm text-blue-700 mt-2">
              동일한 연락처와 차량번호로 이미 등록된 차량이 있습니다.
            </p>
          </div>

          {!hasChanges ? (
            // 변경사항이 없는 경우
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                입력하신 정보와 기존 등록된 정보가 동일합니다. <br />
                이미 등록되어 있는 차량입니다.
              </p>
            </div>
          ) : (
            // 변경사항이 있는 경우
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">변경된 정보</h4>
              <div className="space-y-3">
                {changedFields.map((change) => (
                  <div key={change.field} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {change.label}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-500">기존</span>
                        <div className="text-sm text-gray-900 bg-red-50 p-2 rounded border-l-4 border-red-400">
                          {change.old || '(비어있음)'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">새로운 정보</span>
                        <div className="text-sm text-gray-900 bg-green-50 p-2 rounded border-l-4 border-green-400">
                          {change.new || '(비어있음)'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            {hasChanges ? (
              <>
                <button
                  onClick={onUpdate}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  정보 업데이트
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
                >
                  취소
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                확인
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
