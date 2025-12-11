'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Shield, Loader2, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { addFirestoreData, getFirestoreData } from '@/services/firebase';
import { hashPassword } from '@/services/auth-service';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'checking' | 'exists' | 'setup'>('checking');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('Administrator');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if users exist
  useEffect(() => {
    const checkUsers = async () => {
      try {
        const users = await getFirestoreData('users');
        if (users && Array.isArray(users) && users.length > 0) {
          setStep('exists');
        } else {
          setStep('setup');
        }
      } catch (err) {
        console.error('Error checking users:', err);
        setStep('setup');
      }
    };
    checkUsers();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!username.trim()) {
      setError('Kullanici adi gereklidir');
      return;
    }
    if (password.length < 6) {
      setError('Sifre en az 6 karakter olmalidir');
      return;
    }
    if (password !== confirmPassword) {
      setError('Sifreler eslesmiyor');
      return;
    }

    setIsLoading(true);

    try {
      // Create admin user
      const hashedPassword = hashPassword(password);

      await addFirestoreData('users', {
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        fullName: fullName.trim() || 'Administrator',
        role: 'admin',
        status: 'active',
        permissions: ['all'],
        branchId: 'all',
        branchName: 'Tum Subeler',
      });

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      console.error('Setup error:', err);
      setError('Kullanici olusturulurken hata: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Sistem kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (step === 'exists') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Sistem Hazir</CardTitle>
            <CardDescription>
              Kullanici veritabaninda kayitli kullanicilar mevcut.
              Giris yaparak devam edebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Giris Sayfasina Git
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Kurulum Tamamlandi!</CardTitle>
            <CardDescription>
              Admin kullanici basariyla olusturuldu.
              Giris sayfasina yonlendiriliyorsunuz...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-green-800">Giris Bilgileriniz:</p>
              <p className="text-green-700 mt-1">Kullanici: {username}</p>
              <p className="text-green-700">Sifre: (belirlediginiz sifre)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/25 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Atlas ERP</h1>
          <p className="text-gray-500 mt-1">Ilk Kurulum</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Admin Kullanici Olustur
            </CardTitle>
            <CardDescription>
              Sisteme giris yapabilmek icin bir admin kullanicisi olusturun.
              Bu bilgileri guvenli bir yerde saklayin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Kullanici Adi</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ad Soyad</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Administrator"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sifre</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sifre Tekrar</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Sifreyi tekrar girin"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Olusturuluyor...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Olustur
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Onemli:</strong> Bu sayfa sadece ilk kurulumda kullanilmalidir.
                Kurulum tamamlandiktan sonra bu sayfaya erisim devre disi birakilacaktir.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
