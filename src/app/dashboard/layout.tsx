'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AuthGuard } from '@/components/auth/auth-guard';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // LocalStorage'dan sidebar durumunu dinle
  useEffect(() => {
    const checkSidebarState = () => {
      try {
        const saved = localStorage.getItem('sidebar-collapsed');
        setSidebarCollapsed(saved ? JSON.parse(saved) : false);
      } catch {
        setSidebarCollapsed(false);
      }
    };

    // İlk yükleme
    checkSidebarState();

    // Storage değişikliklerini dinle
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        checkSidebarState();
      }
    };

    // Custom event dinle (aynı tab için)
    const handleCustomEvent = () => checkSidebarState();

    // Mobile menu event
    const handleMobileMenu = (e: CustomEvent) => {
      setMobileMenuOpen(e.detail.open);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sidebar-toggle', handleCustomEvent);
    window.addEventListener('mobile-menu-toggle', handleMobileMenu as EventListener);

    // Interval ile kontrol (fallback)
    const interval = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebar-toggle', handleCustomEvent);
      window.removeEventListener('mobile-menu-toggle', handleMobileMenu as EventListener);
      clearInterval(interval);
    };
  }, []);

  // Ekran boyutu değiştiğinde mobil menüyü kapat
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobil menü açıkken sayfa değişince kapat
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [children]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-muted/30">
        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => {
              setMobileMenuOpen(false);
              window.dispatchEvent(new CustomEvent('mobile-menu-toggle', { detail: { open: false } }));
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => {
          setMobileMenuOpen(false);
          window.dispatchEvent(new CustomEvent('mobile-menu-toggle', { detail: { open: false } }));
        }} />

        {/* Main Content */}
        <div
          className={cn(
            'transition-all duration-300',
            // Desktop: sidebar genisligine gore padding
            'lg:pl-64',
            sidebarCollapsed && 'lg:pl-16',
            // Mobile: padding yok
            'pl-0'
          )}
        >
          <Header onMobileMenuToggle={() => {
            const newState = !mobileMenuOpen;
            setMobileMenuOpen(newState);
            window.dispatchEvent(new CustomEvent('mobile-menu-toggle', { detail: { open: newState } }));
          }} />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
