'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import Link from 'next/link';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { vehicleService } from '@/lib/firestore';
import toast, { Toaster } from 'react-hot-toast';
import DuplicateVehicleDialog from '@/components/vehicles/DuplicateVehicleDialog';

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
  department: z.string().optional(),
  notes: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

export default function PublicVehicleRegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<VehicleFormData | null>(null);
  const [registeredData, setRegisteredData] = useState<VehicleFormData | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  // 중복 체크 관련 상태
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateVehicle, setDuplicateVehicle] = useState<any>(null);
  const [pendingFormData, setPendingFormData] = useState<VehicleFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
    setValue,
    reset,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    mode: 'onSubmit', // 제출 시에만 유효성 검사
  });

  // 휴대폰 번호 마스킹 함수
  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const truncated = numbers.slice(0, 11);
    
    if (truncated.length <= 3) {
      return truncated;
    } else if (truncated.length <= 7) {
      return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
    } else {
      return `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7)}`;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phoneNumber', formatted);
  };

  const handleSecondaryPhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('secondaryPhoneNumber', formatted);
  };

  // 차량번호 입력 핸들러 (공백 제거)
  const handleCarNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, ''); // 모든 공백 제거
    setValue('carNumber', value);
  };

  // 등록 확인 다이얼로그 표시 (중복 체크 포함)
  const handleFormSubmit = async (data: VehicleFormData) => {
    try {
      // 중복 체크
      const duplicates = await vehicleService.checkDuplicateVehicle(
        data.phoneNumber,
        data.carNumber
      );
      
      if (duplicates.length > 0) {
        // 중복 발견 시 다이얼로그 표시
        setDuplicateVehicle(duplicates[0]);
        setPendingFormData(data);
        setShowDuplicateDialog(true);
        return;
      }
      
      // 중복이 없으면 확인 다이얼로그 표시
      setFormData(data);
      setShowConfirmDialog(true);
    } catch (error) {
      console.error('중복 체크 오류:', error);
      toast.error('중복 체크 중 오류가 발생했습니다.');
    }
  };

  // 최종 등록 처리
  const handleConfirmSubmit = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading('차량 정보를 등록하는 중...', {
      position: 'top-center',
    });

    try {
      const currentTime = new Date();
      const vehicleData = {
        ...formData,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      await addDoc(collection(db, 'vehicles'), vehicleData);
      
      toast.success('차량 등록이 완료되었습니다!', {
        id: loadingToast,
        duration: 3000,
        position: 'top-center',
      });

      setRegisteredData(formData);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      reset();
    } catch (error) {
      console.error('차량 등록 중 오류 발생:', error);
      toast.error('차량 등록 중 오류가 발생했습니다. 다시 시도해주세요.', {
        id: loadingToast,
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 중복 다이얼로그에서 업데이트 확인
  const handleDuplicateUpdate = async () => {
    if (!duplicateVehicle || !pendingFormData) return;
    
    setIsSubmitting(true);
    const loadingToast = toast.loading('차량 정보를 업데이트하는 중...', {
      position: 'top-center',
    });
    
    try {
      // 기존 차량 정보를 새 데이터로 업데이트
      await vehicleService.updateVehicle(duplicateVehicle.id, {
        ...pendingFormData,
        updatedBy: 'public-registration'
      });
      
      toast.success('차량 정보가 업데이트되었습니다!', {
        id: loadingToast,
        duration: 3000,
        position: 'top-center',
      });
      
      setRegisteredData(pendingFormData);
      setShowDuplicateDialog(false);
      setShowSuccessDialog(true);
      reset();
    } catch (error) {
      console.error('차량 업데이트 오류:', error);
      toast.error('차량 업데이트 중 오류가 발생했습니다.', {
        id: loadingToast,
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 중복 다이얼로그 취소
  const handleDuplicateCancel = () => {
    setShowDuplicateDialog(false);
    setDuplicateVehicle(null);
    setPendingFormData(null);
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4">
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
              차량 등록
            </h2>
            <p className="text-gray-600">
              차량 정보를 등록해주세요
            </p>
          </div>

          {/* 등록 폼 */}
          <div className="bg-white shadow-lg rounded-lg">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* 이름 */}
                <div className="sm:col-span-1">
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="ownerName"
                    {...register('ownerName')}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.ownerName && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="홍길동"
                  />
                  {errors.ownerName && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.ownerName.message}</p>
                  )}
                </div>

                {/* 연락처 */}
                <div className="sm:col-span-1">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    {...register('phoneNumber')}
                    onChange={handlePhoneNumberChange}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.phoneNumber && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="010-1234-5678"
                    maxLength={13}
                  />
                  {errors.phoneNumber && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                  )}
                </div>

                {/* 차종 */}
                <div className="sm:col-span-1">
                  <label htmlFor="carType" className="block text-sm font-medium text-gray-700 mb-2">
                    차종 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="carType"
                    {...register('carType')}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.carType && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="예) 소나타, 아반떼"
                  />
                  {errors.carType && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.carType.message}</p>
                  )}
                </div>

                {/* 차량번호 */}
                <div className="sm:col-span-1">
                  <label htmlFor="carNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    차량번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="carNumber"
                    {...register('carNumber')}
                    onChange={handleCarNumberChange}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.carNumber && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="예) 12가3456"
                  />
                  {errors.carNumber && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.carNumber.message}</p>
                  )}
                </div>

                {/* 소속 */}
                <div className="sm:col-span-1">
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                    소속
                  </label>
                  <input
                    type="text"
                    id="department"
                    {...register('department')}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3"
                  />
                </div>

                {/* 예비 연락처 */}
                <div className="sm:col-span-1">
                  <label htmlFor="secondaryPhoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    예비 연락처
                  </label>
                  <input
                    type="tel"
                    id="secondaryPhoneNumber"
                    {...register('secondaryPhoneNumber')}
                    onChange={handleSecondaryPhoneNumberChange}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.secondaryPhoneNumber && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="010-1234-5678"
                    maxLength={13}
                  />
                  {errors.secondaryPhoneNumber && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.secondaryPhoneNumber.message}</p>
                  )}
                </div>

                {/* 비고 */}
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    비고
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    {...register('notes')}
                    className="block w-full h-24 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 resize-none"
                    placeholder="추가 정보가 있으면 입력해주세요"
                  />
                </div>
              </div>

              {/* 버튼 영역 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors"
                >
                  등록하기
                </button>
                <Link
                  href="/"
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium transition-colors text-center"
                >
                  돌아가기
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* 확인 다이얼로그 */}
        {showConfirmDialog && formData && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                  등록 내용 확인
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">이름:</span>
                    <span className="text-gray-900">{formData.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">연락처:</span>
                    <span className="text-gray-900">{formData.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">차종:</span>
                    <span className="text-gray-900">{formData.carType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">차량번호:</span>
                    <span className="text-gray-900">{formData.carNumber}</span>
                  </div>
                  {formData.department && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">소속:</span>
                      <span className="text-gray-900">{formData.department}</span>
                    </div>
                  )}
                  {formData.secondaryPhoneNumber && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">예비 연락처:</span>
                      <span className="text-gray-900">{formData.secondaryPhoneNumber}</span>
                    </div>
                  )}
                  {formData.notes && (
                    <div className="pt-2">
                      <span className="font-medium text-gray-700">비고:</span>
                      <p className="text-gray-900 mt-1">{formData.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isSubmitting ? '등록 중...' : '등록 확인'}
                  </button>
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 font-medium"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 성공 다이얼로그 */}
        {showSuccessDialog && registeredData && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                  🎉 등록 완료!
                </h3>
                <p className="text-center text-gray-600 mb-4">
                  차량 정보가 성공적으로 등록되었습니다.
                </p>
                <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">이름:</span>
                    <span className="text-gray-900">{registeredData.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">연락처:</span>
                    <span className="text-gray-900">{registeredData.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">차종:</span>
                    <span className="text-gray-900">{registeredData.carType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">차량번호:</span>
                    <span className="text-gray-900">{registeredData.carNumber}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowSuccessDialog(false);
                      setRegisteredData(null);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    확인
                  </button>
                  <Link
                    href="/"
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium text-center"
                  >
                    홈으로
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
      </div>
    </>
  );
}
