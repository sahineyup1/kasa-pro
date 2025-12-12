'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/services/b2b-auth';

export default function B2BPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const session = getSession();
      if (session) {
        router.push('/b2b/dashboard');
      } else {
        router.push('/b2b/login');
      }
    } catch (error) {
      console.warn('Storage erişim hatası:', error);
      router.push('/b2b/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
