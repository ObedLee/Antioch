'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import Link from 'next/link';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast, { Toaster } from 'react-hot-toast';

const fruitSchema = z.object({
  영접자: z.string().min(1, '영접자를 입력해주세요.'),
  연락처: z.string()
    .min(1, '연락처를 입력해주세요.')
    .regex(/^\d{3}-\d{4}-\d{4}$/, '000-0000-0000 형식으로 입력해주세요.'),
  전도자: z.string().min(1, '전도자를 입력해주세요.'),
  만남날짜: z.string().min(1, '만남날짜를 입력해주세요.'),
  구분: z.string().min(1, '구분을 선택해주세요.'),
  만남장소: z.string().optional(),
  만남횟수: z.string().optional(),
  나이: z.string().optional(),
  영적상태: z.string().optional(),
});

type FruitFormData = z.infer<typeof fruitSchema>;

export default function PublicFruitRegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<FruitFormData | null>(null);
  const [registeredData, setRegisteredData] = useState<FruitFormData | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
    setValue,
    reset,
  } = useForm<FruitFormData>({
    resolver: zodResolver(fruitSchema),
    mode: 'onSubmit', // 제출 시에만 유효성 검사
    defaultValues: {
      만남날짜: new Date().toISOString().split('T')[0], // 오늘 날짜 기본값
    },
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
    setValue('연락처', formatted);
  };

  // 등록 확인 다이얼로그 표시
  const handleFormSubmit = (data: FruitFormData) => {
    setFormData(data);
    setShowConfirmDialog(true);
  };

  // 최종 등록 처리
  const handleConfirmSubmit = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading('열매 정보를 등록하는 중...', {
      position: 'top-center',
    });

    try {
      const currentTime = new Date();
      const fruitData = {
        ...formData,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      await addDoc(collection(db, 'fruits'), fruitData);
      
      toast.success('열매 등록이 완료되었습니다!', {
        id: loadingToast,
        duration: 3000,
        position: 'top-center',
      });

      setRegisteredData(formData);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      reset();
    } catch (error) {
      console.error('열매 등록 중 오류 발생:', error);
      toast.error('열매 등록 중 오류가 발생했습니다. 다시 시도해주세요.', {
        id: loadingToast,
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
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
              열매 등록
            </h2>
            <p className="text-gray-600">
              전도열매 정보를 등록해주세요
            </p>
          </div>

          {/* 등록 폼 */}
          <div className="bg-white shadow-lg rounded-lg">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* 영접자 */}
                <div className="sm:col-span-1">
                  <label htmlFor="영접자" className="block text-sm font-medium text-gray-700 mb-2">
                    영접자 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="영접자"
                    {...register('영접자')}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.영접자 && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="홍길동"
                  />
                  {errors.영접자 && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.영접자.message}</p>
                  )}
                </div>

                {/* 연락처 */}
                <div className="sm:col-span-1">
                  <label htmlFor="연락처" className="block text-sm font-medium text-gray-700 mb-2">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="연락처"
                    {...register('연락처')}
                    onChange={handlePhoneNumberChange}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.연락처 && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="010-1234-5678"
                    maxLength={13}
                  />
                  {errors.연락처 && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.연락처.message}</p>
                  )}
                </div>

                {/* 전도자 */}
                <div className="sm:col-span-1">
                  <label htmlFor="전도자" className="block text-sm font-medium text-gray-700 mb-2">
                    전도자 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="전도자"
                    {...register('전도자')}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.전도자 && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                    placeholder="전도한 사람의 이름"
                  />
                  {errors.전도자 && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.전도자.message}</p>
                  )}
                </div>

                {/* 만남날짜 */}
                <div className="sm:col-span-1">
                  <label htmlFor="만남날짜" className="block text-sm font-medium text-gray-700 mb-2">
                    만남날짜 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="만남날짜"
                    {...register('만남날짜')}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.만남날짜 && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                  />
                  {errors.만남날짜 && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.만남날짜.message}</p>
                  )}
                </div>

                {/* 구분 */}
                <div className="sm:col-span-1">
                  <label htmlFor="구분" className="block text-sm font-medium text-gray-700 mb-2">
                    구분 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="구분"
                    {...register('구분')}
                    className={`block w-full rounded-md shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 ${
                      errors.구분 && isSubmitted ? 'border border-red-300' : 'border border-gray-300'
                    }`}
                  >
                    <option value="">구분을 선택해주세요</option>
                    <option value="재만남">재만남</option>
                    <option value="말씀운동">말씀운동</option>
                    <option value="영접">영접</option>
                  </select>
                  {errors.구분 && isSubmitted && (
                    <p className="mt-1 text-sm text-red-600">{errors.구분.message}</p>
                  )}
                </div>

                {/* 만남장소 */}
                <div className="sm:col-span-1">
                  <label htmlFor="만남장소" className="block text-sm font-medium text-gray-700 mb-2">
                    만남장소
                  </label>
                  <input
                    type="text"
                    id="만남장소"
                    {...register('만남장소')}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3"
                    placeholder="예) 교회, 카페, 집"
                  />
                </div>

                {/* 만남횟수 */}
                <div className="sm:col-span-1">
                  <label htmlFor="만남횟수" className="block text-sm font-medium text-gray-700 mb-2">
                    만남횟수
                  </label>
                  <input
                    type="text"
                    id="만남횟수"
                    {...register('만남횟수')}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3"
                    placeholder="예) 1회, 2회"
                  />
                </div>

                {/* 나이 */}
                <div className="sm:col-span-1">
                  <label htmlFor="나이" className="block text-sm font-medium text-gray-700 mb-2">
                    나이
                  </label>
                  <input
                    type="text"
                    id="나이"
                    {...register('나이')}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3"
                    placeholder="예) 25세, 30대"
                  />
                </div>

                {/* 영적상태 */}
                <div className="sm:col-span-2">
                  <label htmlFor="영적상태" className="block text-sm font-medium text-gray-700 mb-2">
                    영적상태 (비고)
                  </label>
                  <textarea
                    id="영적상태"
                    rows={4}
                    {...register('영적상태')}
                    className="block w-full h-24 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3 resize-none"
                    placeholder="영적 상태나 추가 정보를 입력해주세요"
                  />
                </div>
              </div>

              {/* 버튼 영역 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium transition-colors"
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
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                  등록 내용 확인
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">영접자:</span>
                    <span className="text-gray-900">{formData.영접자}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">연락처:</span>
                    <span className="text-gray-900">{formData.연락처}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">전도자:</span>
                    <span className="text-gray-900">{formData.전도자}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">만남날짜:</span>
                    <span className="text-gray-900">{formData.만남날짜}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">구분:</span>
                    <span className="text-gray-900">{formData.구분}</span>
                  </div>
                  {formData.만남장소 && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">만남장소:</span>
                      <span className="text-gray-900">{formData.만남장소}</span>
                    </div>
                  )}
                  {formData.만남횟수 && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">만남횟수:</span>
                      <span className="text-gray-900">{formData.만남횟수}</span>
                    </div>
                  )}
                  {formData.나이 && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">나이:</span>
                      <span className="text-gray-900">{formData.나이}</span>
                    </div>
                  )}
                  {formData.영적상태 && (
                    <div className="pt-2">
                      <span className="font-medium text-gray-700">영적상태:</span>
                      <p className="text-gray-900 mt-1">{formData.영적상태}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                  열매 정보가 성공적으로 등록되었습니다.
                </p>
                <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">영접자:</span>
                    <span className="text-gray-900">{registeredData.영접자}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">연락처:</span>
                    <span className="text-gray-900">{registeredData.연락처}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">전도자:</span>
                    <span className="text-gray-900">{registeredData.전도자}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">구분:</span>
                    <span className="text-gray-900">{registeredData.구분}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowSuccessDialog(false);
                      setRegisteredData(null);
                    }}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
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
      </div>
    </>
  );
}
