'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { fruitService, Fruit } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import FruitForm from '@/components/fruits/FruitForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function EditFruitPage() {
  const [fruit, setFruit] = useState<Fruit | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const fruitId = params.id as string;

  useEffect(() => {
    const loadFruit = async () => {
      try {
        setLoading(true);
        const fruitData = await fruitService.getFruit(fruitId);
        if (fruitData) {
          setFruit(fruitData);
        } else {
          toast.error('열매를 찾을 수 없습니다.');
          router.push('/dashboard/fruits');
        }
      } catch (error) {
        console.error('열매 정보 로딩 오류:', error);
        toast.error('열매 정보를 불러오는 중 오류가 발생했습니다.');
        router.push('/dashboard/fruits');
      } finally {
        setLoading(false);
      }
    };

    if (user && fruitId) {
      loadFruit();
    }
  }, [user, fruitId, router]);

  const handleSubmit = async (data: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fruitService.updateFruit(fruitId, data);
      toast.success('열매가 성공적으로 수정되었습니다.');
      router.push(`/dashboard/fruits/${fruitId}`);
    } catch (error) {
      console.error('열매 수정 중 오류 발생:', error);
      toast.error('열매 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (fruitId: string) => {
    if (confirm('정말로 이 열매를 삭제하시겠습니까?')) {
      try {
        await fruitService.deleteFruit(fruitId);
        toast.success('열매가 성공적으로 삭제되었습니다.');
        router.push('/dashboard/fruits');
      } catch (error) {
        console.error('열매 삭제 오류:', error);
        toast.error('열매 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" showVerse={true} />
        </div>
      </div>
    );
  }

  if (!fruit) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">열매를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">열매 수정</h1>
          <p className="mt-2 text-sm text-gray-700">
            전도열매 정보를 수정하세요.
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <FruitForm
          initialData={fruit}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="수정"
          onDelete={() => handleDelete(fruitId)}
          showDeleteButton={true}
        />
      </div>
    </div>
  );
}
