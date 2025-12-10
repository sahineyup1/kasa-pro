'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { authenticateUser } from '@/services/auth-service';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated, user, checkSession } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Zaten giris yapilmissa dashboard'a yonlendir
  useEffect(() => {
    if (isAuthenticated && user && checkSession()) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router, checkSession]);

  // Lockout kontrolu
  useEffect(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const timer = setInterval(() => {
        if (Date.now() >= lockoutUntil) {
          setLockoutUntil(null);
          setLoginAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Lockout kontrolu
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Cok fazla basarisiz deneme. ${remainingSeconds} saniye bekleyin.`);
      return;
    }

    // Input validation
    if (!username.trim()) {
      setError('Kullanici adi gereklidir');
      return;
    }
    if (!password) {
      setError('Sifre gereklidir');
      return;
    }
    if (password.length < 4) {
      setError('Sifre en az 4 karakter olmalidir');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateUser(username.trim(), password);

      if (result.success && result.user) {
        // Basarili giris
        setLoginAttempts(0);
        setUser({
          uid: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          role: result.user.role,
          branchId: result.user.branchId,
          branchName: result.user.branchName,
          permissions: result.user.permissions,
        });

        router.push('/dashboard');
      } else {
        // Basarisiz giris
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        // 5 basarisiz denemeden sonra 5 dakika kilitle
        if (newAttempts >= 5) {
          const lockTime = Date.now() + 5 * 60 * 1000; // 5 dakika
          setLockoutUntil(lockTime);
          setError('Cok fazla basarisiz deneme. 5 dakika beklemeniz gerekiyor.');
        } else {
          setError(result.error || 'Giris basarisiz. Bilgilerinizi kontrol edin.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Bir hata olustu. Lutfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRemainingLockoutTime = () => {
    if (!lockoutUntil) return null;
    const remaining = lockoutUntil - Date.now();
    if (remaining <= 0) return null;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.ceil((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <div className="w-full max-w-md relative">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/25 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Atlas ERP</h1>
          <p className="text-gray-500 mt-1">Guvenli Isletme Yonetimi</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Guvenli Giris
            </CardTitle>
            <CardDescription className="text-center">
              Hesabiniza giris yaparak devam edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Lockout Warning */}
              {lockoutUntil && Date.now() < lockoutUntil && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm text-center">
                  Hesap kilitli. Kalan sure: {getRemainingLockoutTime()}
                </div>
              )}

              {/* Login Attempts Warning */}
              {loginAttempts > 2 && loginAttempts < 5 && !lockoutUntil && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-xs text-center">
                  {5 - loginAttempts} deneme hakkiniz kaldi
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Kullanici Adi
                </label>
                <Input
                  type="text"
                  placeholder="kullanici_adi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                  required
                  disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Sifre
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    required
                    disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Dogrulanıyor...
                  </>
                ) : (
                  'Giris Yap'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500">
                Sifremi unuttum veya hesabiniz yok mu?{' '}
                <span className="text-primary font-medium">
                  Yonetici ile iletisime gecin
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-600 text-center">
            <Shield className="w-3 h-3 inline mr-1" />
            Bu sistem yetkili kullanicilara ozeldir. Tum girisler kayit altina alinmaktadir.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          &copy; 2024 Atlas Group. Tum haklari saklidir.
        </p>
      </div>
    </div>
  );
}
