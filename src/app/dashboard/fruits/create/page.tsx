'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { fruitService } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import FruitForm from '@/components/fruits/FruitForm';

export default function CreateFruitPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (data: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fruitService.createFruit(data);
      toast.success('열매가 성공적으로 등록되었습니다.');
      router.push('/dashboard/fruits');
    } catch (error) {
      console.error('열매 등록 중 오류 발생:', error);
      toast.error('열매 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">열매 등록</h1>
          <p className="mt-2 text-sm text-gray-700">
            새로운 전도열매를 등록하세요.
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <FruitForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="등록"
        />
      </div>
    </div>
  );
}
