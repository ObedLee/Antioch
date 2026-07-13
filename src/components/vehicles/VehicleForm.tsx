import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Vehicle, vehicleService } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import DuplicateVehicleDialog from './DuplicateVehicleDialog';
import toast from 'react-hot-toast';

const vehicleSchema = z.object({
  ownerName: z.string().min(1, '이름을 입력해주세요.'),
  phoneNumber: z.string()
    .min(1, '연락처를 입력해주세요.')
    .regex(/^\d{3}-\d{4}-\d{4}$/, '000-0000-0000 형식으로 입력해주세요.'),
  secondaryPhoneNumber: z.string()
    .optional()
    .refine((val) => !val || /^\d{3}-\d{4}-\d{4}$/.test(val), {
      message: '000-0000-0000 형식으로 입력해주세요.'
    }),
  carType: z.string().min(1, '차종을 입력해주세요.'),
  carNumber: z.string().min(1, '차량번호를 입력해주세요.'),
  notes: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  initialData?: Vehicle;
  onSubmit: (data: VehicleFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
  onDelete?: (vehicleId: string) => Promise<void>;
  showDeleteButton?: boolean;
}

export default function VehicleForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText,
  onDelete,
  showDeleteButton = false,
}: VehicleFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  // 중복 체크 관련 상태
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateVehicle, setDuplicateVehicle] = useState<Vehicle | null>(null);
  const [pendingFormData, setPendingFormData] = useState<VehicleFormData | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
    setValue,
    watch,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    mode: 'onSubmit', // 제출 시에만 유효성 검사
    defaultValues: {
      ownerName: initialData?.ownerName || '',
      phoneNumber: initialData?.phoneNumber || '',
      secondaryPhoneNumber: initialData?.secondaryPhoneNumber || '',
      carType: initialData?.carType || '',
      carNumber: initialData?.carNumber || '',
      notes: initialData?.notes || '',
    },
  });

  // 휴대폰 번호 마스킹 함수
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    // 11자리로 제한
    const truncated = numbers.slice(0, 11);
    
    // 000-0000-0000 형식으로 포매팅
    if (truncated.length <= 3) {
      return truncated;
    } else if (truncated.length <= 7) {
      return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
    } else {
      return `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7)}`;
    }
  };

  // 휴대폰 번호 입력 핸들러
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phoneNumber', formatted);
  };

  // 예비 연락처 입력 핸들러
  const handleSecondaryPhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('secondaryPhoneNumber', formatted);
  };

  // 차량번호 입력 핸들러 (공백 제거)
  const handleCarNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, ''); // 모든 공백 제거
    setValue('carNumber', value);
  };

  // 중복 체크 및 폼 제출 처리
  const handleFormSubmit = async (data: VehicleFormData) => {
    try {
      // 중복 체크
      const duplicates = await vehicleService.checkDuplicateVehicle(
        data.phoneNumber,
        data.carNumber,
        initialData?.id // 수정 시 현재 ID 제외
      );
      
      if (duplicates.length > 0) {
        // 중복 발견 시 다이얼로그 표시
        setDuplicateVehicle(duplicates[0]);
        setPendingFormData(data);
        setShowDuplicateDialog(true);
        return;
      }
      
      // 중복이 없으면 정상 제출
      await onSubmit(data);
      router.push('/dashboard/vehicles');
    } catch (error) {
      console.error('차량 정보 저장 중 오류 발생:', error);
      toast.error('차량 정보 저장 중 오류가 발생했습니다.');
    }
  };

  // 중복 다이얼로그에서 업데이트 확인
  const handleDuplicateUpdate = async () => {
    if (!duplicateVehicle || !pendingFormData) return;
    
    try {
      // 기존 차량 정보를 새 데이터로 업데이트
      await vehicleService.updateVehicle(duplicateVehicle.id, pendingFormData);
      toast.success('차량 정보가 업데이트되었습니다.');
      setShowDuplicateDialog(false);
      router.push('/dashboard/vehicles');
    } catch (error) {
      console.error('차량 업데이트 오류:', error);
      toast.error('차량 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 중복 다이얼로그 취소
  const handleDuplicateCancel = () => {
    setShowDuplicateDialog(false);
    setDuplicateVehicle(null);
    setPendingFormData(null);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">기본 정보</h3>
            <p className="mt-1 text-sm text-gray-500">
              차량의 기본 정보를 입력해주세요.
            </p>
          </div>
          <div className="mt-5 space-y-6 md:col-span-2 md:mt-0">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">
                  소유자 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="ownerName"
                  {...register('ownerName')}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                    errors.ownerName && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                  }`}
                />
                {errors.ownerName && isSubmitted && (
                  <p className="mt-1 text-sm text-red-600">{errors.ownerName.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  {...register('phoneNumber')}
                  onChange={handlePhoneNumberChange}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                    errors.phoneNumber && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                  }`}
                  placeholder="010-1234-5678"
                  maxLength={13}
                />
                {errors.phoneNumber && isSubmitted && (
                  <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="carType" className="block text-sm font-medium text-gray-700">
                  차종 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="carType"
                  {...register('carType')}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                    errors.carType && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                  }`}
                  placeholder="예) 그랜저, 소나타"
                />
                {errors.carType && isSubmitted && (
                  <p className="mt-1 text-sm text-red-600">{errors.carType.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="carNumber" className="block text-sm font-medium text-gray-700">
                  차량번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="carNumber"
                  {...register('carNumber')}
                  onChange={handleCarNumberChange}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                    errors.carNumber && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                  }`}
                  placeholder="예) 12가3456"
                />
                {errors.carNumber && isSubmitted && (
                  <p className="mt-1 text-sm text-red-600">{errors.carNumber.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="secondaryPhoneNumber" className="block text-sm font-medium text-gray-700">
                  예비 연락처
                </label>
                <input
                  type="tel"
                  id="secondaryPhoneNumber"
                  {...register('secondaryPhoneNumber')}
                  onChange={handleSecondaryPhoneNumberChange}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                    errors.secondaryPhoneNumber && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                  }`}
                  placeholder="010-1234-5678"
                  maxLength={13}
                />
                {errors.secondaryPhoneNumber && isSubmitted && (
                  <p className="mt-1 text-sm text-red-600">{errors.secondaryPhoneNumber.message}</p>
                )}
              </div>

              <div className="col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  비고
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    rows={4}
                    {...register('notes')}
                    className="block w-full h-24 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 resize-none"
                    defaultValue={''}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex space-x-2">
          {showDeleteButton && onDelete && initialData && (
            <button
              type="button"
              onClick={() => {
                if (confirm('정말로 이 차량을 삭제하시겠습니까?')) {
                  onDelete(initialData.id);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              삭제
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '저장 중...' : submitButtonText}
          </button>
          <button
            type="button"
            onClick={() => {
              router.push('/dashboard/vehicles');
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            취소
          </button>
        </div>
      </div>
      
      {/* 중복 확인 다이얼로그 */}
      {showDuplicateDialog && duplicateVehicle && pendingFormData && (
        <DuplicateVehicleDialog
          isOpen={showDuplicateDialog}
          onClose={handleDuplicateCancel}
          existingVehicle={duplicateVehicle}
          newVehicleData={pendingFormData}
          onUpdate={handleDuplicateUpdate}
          onCancel={handleDuplicateCancel}
        />
      )}
    </form>
  );
}
