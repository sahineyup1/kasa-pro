'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getSession } from '@/services/b2b-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye, EyeOff, LogIn, Loader2, ShoppingBag, Package, Truck,
  CreditCard, Sparkles, ArrowRight, Shield, Lock, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';

const FEATURES = [
  { icon: ShoppingBag, text: 'Online siparis', delay: 0 },
  { icon: Package, text: 'Urun katalogu', delay: 0.1 },
  { icon: Truck, text: 'Hizli teslimat', delay: 0.2 },
  { icon: CreditCard, text: 'Kolay odeme', delay: 0.3 },
];

export default function B2BLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    try {
      const session = getSession();
      if (session) {
        router.push('/b2b/dashboard');
      }
    } catch (error) {
      console.warn('Session kontrol hatası:', error);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('Kullanici adi ve sifre gerekli');
      return;
    }

    setLoading(true);

    try {
      const result = await login(username.trim(), password);

      if (result.success) {
        toast.success('Giris basarili!');
        router.push('/b2b/dashboard');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Giris hatasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-grid opacity-5"></div>
          <motion.div
            animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-4 mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                <span className="text-white font-bold text-2xl">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Atlas Group</h1>
                <p className="text-blue-300 text-sm">B2B Siparis Portali</p>
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Isletmeniz icin
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                dijital cozumler
              </span>
            </h2>

            <p className="text-blue-200 text-lg mb-12 max-w-md">
              B2B portalimiz ile siparislerinizi kolayca verin, takip edin ve isletmenizi buyutun.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + feature.delay }}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-blue-300" />
                  </div>
                  <span className="text-white font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-4">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Atlas Group</h1>
            <p className="text-gray-500 mt-1">B2B Siparis Portali</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-2 mb-4">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Guvenli Giris</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Hesabiniza Giris Yapin</h2>
              <p className="text-gray-500 mt-2">
                Siparis portaliniza hosgeldiniz
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 font-medium">
                  Kullanici Adi
                </Label>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    focusedInput === 'username' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <Input
                    id="username"
                    type="text"
                    placeholder="kullanici_adi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput(null)}
                    disabled={loading}
                    autoComplete="username"
                    autoFocus
                    className="pl-12 h-12 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Sifre
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    focusedInput === 'password' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    disabled={loading}
                    autoComplete="current-password"
                    className="pl-12 pr-12 h-12 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Giris yapiliyor...
                  </>
                ) : (
                  <>
                    Giris Yap
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Help */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-500 text-sm">
                Hesabiniz yok mu?{' '}
                <a
                  href="mailto:info@atlasgroup.si"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Bizimle iletisime gecin
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-400 mt-8">
            &copy; {new Date().getFullYear()} Atlas Group d.o.o. Tum haklari saklidir.
          </p>
        </motion.div>
      </div>

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </div>
  );
}
