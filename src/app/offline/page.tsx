'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10 text-gray-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Baglanti Yok
          </h1>

          <p className="text-gray-600 mb-6">
            Internet baglantiniz kesildi. Lutfen baglantinizi kontrol edin ve tekrar deneyin.
          </p>

          <Button onClick={handleRefresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tekrar Dene
          </Button>

          <p className="text-xs text-gray-400 mt-6">
            Atlas ERP - Cevrimdisi Mod
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
