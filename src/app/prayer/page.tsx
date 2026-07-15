'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrayerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my?tab=prayer');
  }, [router]);

  return null;
}
