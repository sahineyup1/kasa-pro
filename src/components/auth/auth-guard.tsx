'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Auth durumunu kontrol et
    const checkAuth = () => {
      if (!isLoading) {
        if (!isAuthenticated || !user) {
          // Giriş yapılmamış, login sayfasına yönlendir
          console.log('Auth Guard: Not authenticated, redirecting to login');
          router.replace('/');
        } else {
          setIsChecking(false);
        }
      }
    };

    checkAuth();
  }, [isAuthenticated, user, isLoading, router, pathname]);

  // Yükleniyor veya kontrol ediliyor
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Oturum kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Giriş yapılmış, içeriği göster
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  // Giriş yapılmamış - loading göster (redirect olacak)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600">Yonlendiriliyor...</p>
      </div>
    </div>
  );
}
