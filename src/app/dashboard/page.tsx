'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/dashboard/vehicles');
    }
  }, [user, router]);

  return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner size="md" showVerse={false} />
    </div>
  );
}
