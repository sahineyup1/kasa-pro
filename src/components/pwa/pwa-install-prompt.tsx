'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // iOS kontrolu
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Standalone mod kontrolu (zaten yuklenmis mi?)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Daha once reddedilmis mi kontrol et
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // beforeinstallprompt eventi dinle
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // 7 gun gecmisse veya hic reddedilmemisse goster
      if (daysSinceDismissed > 7 || !dismissed) {
        setTimeout(() => setShowPrompt(true), 3000); // 3 saniye sonra goster
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS icin manuel kontrol (beforeinstallprompt desteklemiyor)
    if (isIOSDevice && !isInStandaloneMode && (daysSinceDismissed > 7 || !dismissed)) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installed');
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Zaten yuklenmisse veya gosterilmeyecekse null don
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Atlas ERP Uygulamasi</h3>
              {isIOS ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Uygulamayi yuklemek icin Safari&apos;de{' '}
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 4.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM7.5 8a.5.5 0 00-.5.5v7a.5.5 0 001 0V9h4v6.5a.5.5 0 001 0v-7a.5.5 0 00-.5-.5h-5z"/>
                    </svg>
                  </span>{' '}
                  simgesine basin ve &quot;Ana Ekrana Ekle&quot; secin.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Hizli erisim icin ana ekrana ekleyin. Cevrimdisi da calisir!
                </p>
              )}

              <div className="flex items-center gap-2 mt-3">
                {!isIOS && deferredPrompt && (
                  <Button size="sm" onClick={handleInstall} className="h-8">
                    <Download className="w-3 h-3 mr-1" />
                    Yukle
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8">
                  Daha Sonra
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
