'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { fruitService, Fruit } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function FruitDetailPage() {
  const [fruit, setFruit] = useState<Fruit | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const fruitId = params.id as string;

  useEffect(() => {
    const loadFruit = async () => {
      try {
        setLoading(true);
        const data = await fruitService.getFruit(fruitId);
        if (data) {
          setFruit(data);
        } else {
          toast.error('열매를 찾을 수 없습니다.');
          router.push('/dashboard/fruits');
        }
      } catch (error) {
        console.error('열매 상세 정보 로딩 오류:', error);
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

  const handleDelete = async () => {
    if (!fruit) return;
    
    if (confirm('정말로 이 열매를 삭제하시겠습니까?')) {
      try {
        await fruitService.deleteFruit(fruit.id);
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
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="md" showVerse={true} />
        </div>
      </div>
    );
  }

  if (!fruit) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">열매를 찾을 수 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">요청하신 열매가 존재하지 않습니다.</p>
          <div className="mt-6">
            <Link
              href="/dashboard/fruits"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">열매 상세</h1>
            <p className="mt-2 text-sm text-gray-700">전도열매 정보를 확인합니다.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              삭제
            </button>
            <Link
              href={`/dashboard/fruits/${fruit.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              편집
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {fruit.영접자}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            전도자: {fruit.전도자}
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">영접자</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.영접자}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">전도자</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.전도자}</dd>
            </div>
            {fruit.사역자 && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">사역자</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.사역자}</dd>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">구분</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  fruit.구분 === '재만남' ? 'bg-green-100 text-green-800' :
                  fruit.구분 === '말씀운동' ? 'bg-blue-100 text-blue-800' :
                  fruit.구분 === '영접' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {fruit.구분}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">만남날짜</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.만남날짜}</dd>
            </div>
            {fruit.만남장소 && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">만남장소</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.만남장소}</dd>
              </div>
            )}
            {fruit.만남횟수 && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">만남횟수</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.만남횟수}</dd>
              </div>
            )}
            {fruit.나이 && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">나이</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.나이}</dd>
              </div>
            )}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">연락처</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fruit.연락처}</dd>
            </div>
            {fruit.영적상태 && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">영적상태 (비고)</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">{fruit.영적상태}</dd>
              </div>
            )}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">등록일</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {fruit.createdAt ? new Date(fruit.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : ''}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">수정일</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {fruit.updatedAt ? new Date(fruit.updatedAt.seconds * 1000).toLocaleDateString('ko-KR') : ''}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/dashboard/fruits"
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
