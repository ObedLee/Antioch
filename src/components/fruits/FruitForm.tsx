import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Fruit } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const fruitSchema = z.object({
  영접자: z.string().min(1, '영접자를 입력해주세요.'),
  전도자: z.string().min(1, '전도자를 입력해주세요.'),
  구분: z.string().min(1, '구분을 선택해주세요.'),
  만남날짜: z.string().min(1, '만남날짜을 입력해주세요.'),
  만남장소: z.string().optional(),
  만남횟수: z.string().optional(),
  나이: z.string().optional(),
  연락처: z.string()
    .optional()
    .refine((val) => !val || /^\d{3}-\d{4}-\d{4}$/.test(val), {
      message: '000-0000-0000 형식으로 입력해주세요.'
    }),
  영적상태: z.string().optional(),
});

type FruitFormData = z.infer<typeof fruitSchema>;

interface FruitFormProps {
  initialData?: Fruit;
  onSubmit: (data: FruitFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
  onDelete?: (fruitId: string) => Promise<void>;
  showDeleteButton?: boolean;
}

export default function FruitForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText,
  onDelete,
  showDeleteButton = false,
}: FruitFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
    setValue,
    watch,
  } = useForm<FruitFormData>({
    resolver: zodResolver(fruitSchema),
    mode: 'onSubmit', // 제출 시에만 유효성 검사
    defaultValues: {
      영접자: initialData?.영접자 || '',
      전도자: initialData?.전도자 || '',
      구분: initialData?.구분 || '영접',
      만남날짜: initialData?.만남날짜 || new Date().toISOString().split('T')[0],
      만남장소: initialData?.만남장소 || '',
      만남횟수: initialData?.만남횟수 || '',
      나이: initialData?.나이 || '',
      연락처: initialData?.연락처 || '',
      영적상태: initialData?.영적상태 || '',
    },
  });

  // 연락처 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('연락처', formatted);
  };

  const handleFormSubmit = async (data: FruitFormData) => {
    try {
      await onSubmit(data);
      router.push('/dashboard/fruits');
    } catch (error) {
      console.error('열매 정보 저장 중 오류 발생:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">기본 정보</h3>
            <p className="mt-1 text-sm text-gray-500">
              전도열매의 기본 정보를 입력해주세요.
            </p>
          </div>
          <div className="mt-5 space-y-6 md:col-span-2 md:mt-0">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="영접자" className="block text-sm font-medium text-gray-700">
                  영접자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="영접자"
                  {...register('영접자')}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                />
                {errors.영접자 && (
                  <p className="mt-2 text-sm text-red-600">{errors.영접자.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="전도자" className="block text-sm font-medium text-gray-700">
                  전도자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="전도자"
                  {...register('전도자')}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                />
                {errors.전도자 && (
                  <p className="mt-2 text-sm text-red-600">{errors.전도자.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="구분" className="block text-sm font-medium text-gray-700">
                  구분 <span className="text-red-500">*</span>
                </label>
                <select
                  id="구분"
                  {...register('구분')}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                >
                  <option value="영접">영접</option>
                  <option value="재만남">재만남</option>
                  <option value="말씀운동">말씀운동</option>
                  <option value="기타">기타</option>
                </select>
                {errors.구분 && (
                  <p className="mt-2 text-sm text-red-600">{errors.구분.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="만남날짜" className="block text-sm font-medium text-gray-700">
                  만남날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="만남날짜"
                  {...register('만남날짜')}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                />
                {errors.만남날짜 && (
                  <p className="mt-2 text-sm text-red-600">{errors.만남날짜.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="만남장소" className="block text-sm font-medium text-gray-700">
                  만남장소
                </label>
                <input
                  type="text"
                  id="만남장소"
                  {...register('만남장소')}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                />
                {errors.만남장소 && (
                  <p className="mt-2 text-sm text-red-600">{errors.만남장소.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="만남횟수" className="block text-sm font-medium text-gray-700">
                  만남횟수
                </label>
                <input
                  type="text"
                  id="만남횟수"
                  {...register('만남횟수')}
                  placeholder="예: 1회, 2회"
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                />
                {errors.만남횟수 && (
                  <p className="mt-2 text-sm text-red-600">{errors.만남횟수.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="나이" className="block text-sm font-medium text-gray-700">
                  나이
                </label>
                <input
                  type="text"
                  id="나이"
                  {...register('나이')}
                  placeholder="예: 25세, 30대"
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                />
                {errors.나이 && (
                  <p className="mt-2 text-sm text-red-600">{errors.나이.message}</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="연락처" className="block text-sm font-medium text-gray-700">
                  연락처
                </label>
                <input
                  type="tel"
                  id="연락처"
                  {...register('연락처')}
                  onChange={handlePhoneChange}
                  placeholder="010-1234-5678"
                  maxLength={13}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm px-3 py-2"
                />
                {errors.연락처 && isSubmitted && (
                  <p className="mt-2 text-sm text-red-600">{errors.연락처.message}</p>
                )}
              </div>

              <div className="col-span-6">
                <label htmlFor="영적상태" className="block text-sm font-medium text-gray-700">
                  영적상태 (비고)
                </label>
                <textarea
                  id="영적상태"
                  rows={4}
                  {...register('영적상태')}
                  placeholder="영적 상태나 특이사항을 입력하세요"
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm resize-none px-3 py-2"
                  style={{ height: '100px' }}
                />
                {errors.영적상태 && (
                  <p className="mt-2 text-sm text-red-600">{errors.영적상태.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {showDeleteButton && onDelete && initialData && (
          <button
            type="button"
            onClick={() => onDelete(initialData.id)}
            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            삭제
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : submitButtonText}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/fruits')}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          취소
        </button>
      </div>
    </form>
  );
}
