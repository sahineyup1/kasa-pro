'use client';

import { useState, useEffect } from 'react';
import { getSession, logout, B2BSession } from '@/services/b2b-auth';
import { getData } from '@/services/firebase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User, Settings, LogOut, FileText, Shield, Globe,
  ChevronDown, HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { B2BLanguage } from '@/services/b2b-translations';
import Link from 'next/link';

export function B2BHeader() {
  const router = useRouter();
  const [session, setSession] = useState<B2BSession | null>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [lang, setLang] = useState<B2BLanguage>('sl');

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    if (currentSession?.partnerId) {
      loadPartnerData(currentSession.partnerId);
    }
  }, []);

  const loadPartnerData = async (partnerId: string) => {
    try {
      const data = await getData(`partners/${partnerId}`);
      setPartnerData(data);
      if (data?.b2bLogin?.language) {
        setLang(data.b2bLogin.language);
      }
    } catch (error) {
      console.error('Partner load error:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/b2b/login');
  };

  const companyName = partnerData?.basic?.name || session?.partnerName || 'B2B';
  const username = partnerData?.b2bLogin?.username || session?.username || 'user';

  // Menu items with translations
  const menuLabels = {
    sl: {
      profile: 'Profil',
      settings: 'Nastavitve',
      language: 'Jezik',
      terms: 'Pogoji uporabe',
      privacy: 'Zasebnost',
      help: 'Pomoc',
      logout: 'Odjava',
    },
    de: {
      profile: 'Profil',
      settings: 'Einstellungen',
      language: 'Sprache',
      terms: 'Nutzungsbedingungen',
      privacy: 'Datenschutz',
      help: 'Hilfe',
      logout: 'Abmelden',
    },
    en: {
      profile: 'Profile',
      settings: 'Settings',
      language: 'Language',
      terms: 'Terms of Use',
      privacy: 'Privacy Policy',
      help: 'Help',
      logout: 'Logout',
    },
    tr: {
      profile: 'Profil',
      settings: 'Ayarlar',
      language: 'Dil',
      terms: 'Kullanim Sartlari',
      privacy: 'Gizlilik',
      help: 'Yardim',
      logout: 'Cikis',
    },
  };

  const labels = menuLabels[lang] || menuLabels.sl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 h-auto py-1.5 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {companyName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{companyName}</p>
            <p className="text-xs text-gray-500">@{username}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{companyName}</p>
            <p className="text-xs leading-none text-muted-foreground">@{username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Account Section */}
        <Link href="/b2b/settings">
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>{labels.profile}</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/b2b/settings#language">
          <DropdownMenuItem className="cursor-pointer">
            <Globe className="mr-2 h-4 w-4" />
            <span>{labels.language}</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/b2b/settings#preferences">
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>{labels.settings}</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        {/* Legal Section */}
        <Link href="/b2b/legal/terms">
          <DropdownMenuItem className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            <span>{labels.terms}</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/b2b/legal/privacy">
          <DropdownMenuItem className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>{labels.privacy}</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        {/* Help */}
        <Link href="/b2b/legal/help">
          <DropdownMenuItem className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>{labels.help}</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        {/* Logout - at the bottom */}
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{labels.logout}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
