'use client';

import { useState, useEffect } from 'react';
import { getSession, B2BSession, logout } from '@/services/b2b-auth';
import { getData, updateData } from '@/services/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User, Settings, Globe, Lock, Building2, Mail, Phone, MapPin,
  Save, Loader2, CheckCircle, LogOut, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { B2B_LANGUAGES, B2BLanguage, t } from '@/services/b2b-translations';
import Link from 'next/link';

interface PartnerData {
  basic?: {
    name?: string;
    code?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  };
  b2bLogin?: {
    username?: string;
    language?: B2BLanguage;
    discount?: number;
    customerType?: string;
  };
}

export default function B2BSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<B2BSession | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [selectedLanguage, setSelectedLanguage] = useState<B2BLanguage>('sl');

  // Current language for UI
  const lang = selectedLanguage;

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push('/b2b/login');
      return;
    }
    setSession(currentSession);
    loadPartnerData(currentSession.partnerId);
  }, [router]);

  const loadPartnerData = async (partnerId: string) => {
    try {
      const data = await getData(`partners/${partnerId}`);
      setPartnerData(data);
      if (data?.b2bLogin?.language) {
        setSelectedLanguage(data.b2bLogin.language);
      }
    } catch (error) {
      console.error('Partner load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLanguage = async () => {
    if (!session?.partnerId) return;

    setSaving(true);
    try {
      await updateData(`partners/${session.partnerId}/b2bLogin`, {
        language: selectedLanguage,
      });
      toast.success(t('save', lang) + ' ✓');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('error', lang));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/b2b/login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-500">{t('loading', lang)}</p>
      </div>
    );
  }

  const companyName = partnerData?.basic?.name || session?.partnerName || '-';
  const username = partnerData?.b2bLogin?.username || '-';
  const email = partnerData?.contact?.email || '-';
  const phone = partnerData?.contact?.phone || '-';
  const address = partnerData?.contact?.address;
  const fullAddress = address
    ? `${address.street || ''}, ${address.postalCode || ''} ${address.city || ''}`
    : '-';
  const customerType = partnerData?.b2bLogin?.customerType || 'market';
  const discount = partnerData?.b2bLogin?.discount || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings', lang)}</h1>
          <p className="text-gray-500">{t('account', lang)}</p>
        </div>
        <Link href="/b2b/products">
          <Button variant="outline" size="sm">
            {t('back', lang)}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('profile', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="space-y-2">
                <Label className="text-gray-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {lang === 'tr' ? 'Firma' : lang === 'de' ? 'Firma' : lang === 'en' ? 'Company' : 'Podjetje'}
                </Label>
                <p className="font-medium text-lg">{companyName}</p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label className="text-gray-500 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {lang === 'tr' ? 'Kullanıcı Adı' : lang === 'de' ? 'Benutzername' : lang === 'en' ? 'Username' : 'Uporabniško ime'}
                </Label>
                <p className="font-medium">{username}</p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-gray-500 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <p className="font-medium">{email}</p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-gray-500 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {lang === 'tr' ? 'Telefon' : lang === 'de' ? 'Telefon' : lang === 'en' ? 'Phone' : 'Telefon'}
                </Label>
                <p className="font-medium">{phone}</p>
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-gray-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {lang === 'tr' ? 'Adres' : lang === 'de' ? 'Adresse' : lang === 'en' ? 'Address' : 'Naslov'}
                </Label>
                <p className="font-medium">{fullAddress}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="pt-4 border-t flex flex-wrap gap-4">
              <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">
                  {lang === 'tr' ? 'Müşteri Tipi' : lang === 'de' ? 'Kundentyp' : lang === 'en' ? 'Customer Type' : 'Tip stranke'}:
                  <strong className="ml-1">
                    {customerType === 'market' ? (lang === 'tr' ? 'Market' : 'Market') :
                     customerType === 'kasap' ? (lang === 'tr' ? 'Kasap' : 'Mesnica') :
                     (lang === 'tr' ? 'Her İkisi' : 'Oba')}
                  </strong>
                </span>
              </div>
              {discount > 0 && (
                <div className="px-3 py-1.5 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">
                    {lang === 'tr' ? 'İskonto' : lang === 'de' ? 'Rabatt' : lang === 'en' ? 'Discount' : 'Popust'}:
                    <strong className="ml-1">%{discount}</strong>
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Language Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('language', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="space-y-2 flex-1">
                <Label>{lang === 'tr' ? 'Portal Dili' : lang === 'de' ? 'Portal Sprache' : lang === 'en' ? 'Portal Language' : 'Jezik portala'}</Label>
                <Select value={selectedLanguage} onValueChange={(v: B2BLanguage) => setSelectedLanguage(v)}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {B2B_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{language.flag}</span>
                          <span>{language.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSaveLanguage}
                disabled={saving || selectedLanguage === partnerData?.b2bLogin?.language}
                className={saved ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saved ? (lang === 'tr' ? 'Kaydedildi' : lang === 'de' ? 'Gespeichert' : lang === 'en' ? 'Saved' : 'Shranjeno') : t('save', lang)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {lang === 'tr' ? 'Güvenlik' : lang === 'de' ? 'Sicherheit' : lang === 'en' ? 'Security' : 'Varnost'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm mb-4">
              {lang === 'tr' ? 'Şifre değiştirmek için yönetici ile iletişime geçin.' :
               lang === 'de' ? 'Kontaktieren Sie den Administrator, um Ihr Passwort zu ändern.' :
               lang === 'en' ? 'Contact administrator to change your password.' :
               'Za spremembo gesla se obrnite na skrbnika.'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-red-900">{t('logout', lang)}</h3>
                <p className="text-sm text-red-700">
                  {lang === 'tr' ? 'Oturumu sonlandır ve çıkış yap' :
                   lang === 'de' ? 'Sitzung beenden und abmelden' :
                   lang === 'en' ? 'End session and sign out' :
                   'Končaj sejo in se odjavi'}
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout', lang)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
