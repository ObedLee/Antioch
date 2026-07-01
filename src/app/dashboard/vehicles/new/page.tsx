'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { vehicleService } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import VehicleForm from '@/components/vehicles/VehicleForm';

export default function NewVehiclePage() {
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
      await vehicleService.addVehicle({
        ...data,
        createdBy: user.uid,
        updatedBy: user.uid,
      });
      toast.success('차량이 성공적으로 등록되었습니다.');
      router.push('/dashboard/vehicles');
    } catch (error) {
      console.error('차량 등록 중 오류 발생:', error);
      toast.error('차량 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">차량 등록</h1>
          <p className="mt-2 text-sm text-gray-700">
            새로운 차량을 등록하세요.
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <VehicleForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="등록"
        />
      </div>
    </div>
  );
}
