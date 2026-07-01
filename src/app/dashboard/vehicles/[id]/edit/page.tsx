'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { vehicleService, Vehicle } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import VehicleForm from '@/components/vehicles/VehicleForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function EditVehiclePage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        setIsLoading(true);
        const vehicleId = params.id as string;
        const data = await vehicleService.getVehicleById(vehicleId);
        
        if (!data) {
          toast.error('차량을 찾을 수 없습니다.');
          router.push('/dashboard/vehicles');
          return;
        }
        
        setVehicle(data);
      } catch (error) {
        console.error('차량 정보를 불러오는 중 오류 발생:', error);
        toast.error('차량 정보를 불러오는 중 오류가 발생했습니다.');
        router.push('/dashboard/vehicles');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadVehicle();
    }
  }, [params.id, router, user]);

  const handleSubmit = async (data: any) => {
    if (!user || !vehicle) return;

    try {
      setIsSubmitting(true);
      await vehicleService.updateVehicle(vehicle.id, {
        ...data,
        updatedBy: user.uid,
      });
      toast.success('차량 정보가 성공적으로 수정되었습니다.');
      router.push('/dashboard/vehicles');
    } catch (error) {
      console.error('차량 정보 수정 중 오류 발생:', error);
      toast.error('차량 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!user) return;

    try {
      await vehicleService.deleteVehicle(vehicleId);
      toast.success('차량이 성공적으로 삭제되었습니다.');
      router.push('/dashboard/vehicles');
    } catch (error) {
      console.error('차량 삭제 중 오류 발생:', error);
      toast.error('차량 삭제 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="md" showVerse={true} />
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">차량 정보 수정</h1>
          <p className="mt-2 text-sm text-gray-700">
            차량 정보를 수정하세요.
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <VehicleForm
          initialData={vehicle}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="수정"
          onDelete={handleDelete}
          showDeleteButton={true}
        />
      </div>
    </div>
  );
}
