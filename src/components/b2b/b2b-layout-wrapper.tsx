'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, logout, B2BSession } from '@/services/b2b-auth';
import {
  ShoppingCart, Package, FileText, CreditCard, LogOut, Menu, X,
  Home, ChevronRight, Loader2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const CART_KEY = 'b2b_cart';

// Güvenli localStorage
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
};

interface B2BLayoutWrapperProps {
  children: React.ReactNode;
}

export function B2BLayoutWrapper({ children }: B2BLayoutWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<B2BSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setMounted(true);

    // Session kontrolü
    let currentSession = null;
    try {
      currentSession = getSession();
    } catch (error) {
      console.warn('Session okuma hatası:', error);
    }
    setSession(currentSession);
    setLoading(false);

    if (!currentSession) {
      router.push('/b2b/login');
    }

    // Cart count
    const savedCart = safeStorage.getItem(CART_KEY);
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        setCartCount(cart.length || 0);
      } catch {}
    }
  }, [pathname, router]);

  // Cart count güncellemesi
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      const savedCart = safeStorage.getItem(CART_KEY);
      if (savedCart) {
        try {
          const cart = JSON.parse(savedCart);
          setCartCount(cart.length || 0);
        } catch {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/b2b/login');
  };

  // Hydration için bekle
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          </div>
          <p className="mt-4 text-gray-500">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          </div>
          <p className="mt-4 text-gray-500">Yukleniyor...</p>
        </motion.div>
      </div>
    );
  }

  // Session yoksa loading göster (redirect beklenirken)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-500">Yonlendiriliyor...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/b2b/dashboard', icon: Home, label: 'Anasayfa' },
    { href: '/b2b/products', icon: Package, label: 'Urunler' },
    { href: '/b2b/orders', icon: FileText, label: 'Siparisler' },
    { href: '/b2b/payments', icon: CreditCard, label: 'Odemeler' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/b2b/dashboard" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">Atlas Group</h1>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  B2B Portal
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center">
              <div className="flex items-center bg-gray-100/80 rounded-xl p-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-500' : ''}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-2">
              {/* Cart Icon */}
              <Link href="/b2b/cart">
                <Button variant="ghost" size="sm" className="relative hover:bg-green-50 group">
                  <ShoppingCart className="w-5 h-5 text-gray-600 group-hover:text-green-600 transition-colors" />
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </Button>
              </Link>

              {/* User Info - Desktop */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {session.partnerName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 max-w-[120px] truncate">
                      {session.partnerName}
                    </p>
                    <p className="text-xs text-gray-500">{session.username}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isActive ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                          </div>
                          {item.label}
                        </div>
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                      </Link>
                    </motion.div>
                  );
                })}

                {/* User Section */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="border-t border-gray-100 pt-4 mt-4"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-medium">
                          {session.partnerName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.partnerName}</p>
                        <p className="text-xs text-gray-500">{session.username}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Cikis
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-200/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Atlas Group d.o.o. - B2B Siparis Portali
          </p>
        </div>
      </footer>
    </div>
  );
}
