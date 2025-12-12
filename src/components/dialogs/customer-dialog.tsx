'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pushData, updateData, getData } from '@/services/firebase';
import { Loader2, Building2, User, CreditCard, MapPin, Phone, Shield, CheckCircle, XCircle, AlertCircle, Store, Key, Percent, Tags, Package, Search, X, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORIES } from '@/services/categories';
import { B2B_LANGUAGES, B2BLanguage } from '@/services/b2b-translations';
import { createB2BAccount, changePassword } from '@/services/b2b-auth';

import { validateVATNumber } from '@/lib/vies';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
  viewMode?: boolean;
  onSave?: () => void;
  onSuccess?: () => void;
}

// Ülke listesi - Python ERP ile aynı
const countries = [
  { code: 'SI', name: 'Slovenya', flag: '🇸🇮' },
  { code: 'AT', name: 'Avusturya', flag: '🇦🇹' },
  { code: 'DE', name: 'Almanya', flag: '🇩🇪' },
  { code: 'IT', name: 'İtalya', flag: '🇮🇹' },
  { code: 'HR', name: 'Hırvatistan', flag: '🇭🇷' },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷' },
  { code: 'FR', name: 'Fransa', flag: '🇫🇷' },
  { code: 'ES', name: 'İspanya', flag: '🇪🇸' },
  { code: 'GR', name: 'Yunanistan', flag: '🇬🇷' },
  { code: 'HU', name: 'Macaristan', flag: '🇭🇺' },
  { code: 'CZ', name: 'Çekya', flag: '🇨🇿' },
  { code: 'SK', name: 'Slovakya', flag: '🇸🇰' },
];

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  viewMode = false,
  onSave,
  onSuccess,
}: CustomerDialogProps) {
  const isEditMode = !!customer?.id;
  const [loading, setLoading] = useState(false);
  const [validatingVat, setValidatingVat] = useState(false);
  const [vatValidationResult, setVatValidationResult] = useState<{
    valid?: boolean;
    countryCode?: string;
    companyName?: string;
    companyAddress?: string;
    error?: string;
  } | null>(null);

  // Form state - Python ERP ile aynı alanlar
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('company');
  const [status, setStatus] = useState('active');
  const [customerGroup, setCustomerGroup] = useState('standard');

  // Contact
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [website, setWebsite] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('SI');

  // Financial
  const [vatCountryCode, setVatCountryCode] = useState('SI');
  const [vatNumber, setVatNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paymentTerms, setPaymentTerms] = useState('30');

  // Notes
  const [notes, setNotes] = useState('');

  // B2B Portal Ayarlari
  const [b2bEnabled, setB2bEnabled] = useState(false);
  const [b2bUsername, setB2bUsername] = useState('');
  const [b2bPassword, setB2bPassword] = useState('');
  const [b2bCustomerType, setB2bCustomerType] = useState<'market' | 'kasap' | 'both'>('market');
  const [b2bDiscount, setB2bDiscount] = useState('0');
  const [b2bAllowedCategories, setB2bAllowedCategories] = useState<string[]>([]);
  const [b2bCategoryDiscounts, setB2bCategoryDiscounts] = useState<Record<string, number>>({});
  const [b2bProductPrices, setB2bProductPrices] = useState<Record<string, { price?: number; discount?: number }>>({});
  const [b2bLanguage, setB2bLanguage] = useState<B2BLanguage>('sl');
  const [b2bPermissions, setB2bPermissions] = useState({
    canOrder: true,
    canViewPrices: true,
    canViewBalance: true,
    canViewHistory: true,
  });
  const [savingB2b, setSavingB2b] = useState(false);

  // Ürün özel fiyat dialog state
  const [showProductPrices, setShowProductPrices] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Load customer data on edit
  useEffect(() => {
    if (customer) {
      // Support both flat and nested structure
      const basic = customer.basic || {};
      const contact = customer.contact || {};
      const addressInfo = customer.addressInfo || {};
      const financial = customer.financial || {};

      setCode(basic.code || customer.code || '');
      setName(basic.name || customer.name || customer.companyName || '');
      setType(basic.type || customer.type || 'company');
      setStatus(basic.status || customer.status || 'active');
      setCustomerGroup(basic.customerGroup || customer.customerGroup || 'standard');

      setEmail(contact.email || customer.email || '');
      setPhone(contact.phone || customer.phone || '');
      setMobile(contact.mobile || customer.mobile || '');
      setWebsite(contact.website || customer.website || '');

      setAddress(addressInfo.street || customer.address || '');
      setCity(addressInfo.city || customer.city || '');
      setPostalCode(addressInfo.postalCode || customer.postalCode || '');
      setCountry(addressInfo.country || customer.country || 'SI');

      // VAT numarasından ülke kodunu ayır
      const fullVat = financial.vatNumber || customer.vatNumber || '';
      if (fullVat && fullVat.length >= 2) {
        const countryPart = fullVat.substring(0, 2).toUpperCase();
        const numberPart = fullVat.substring(2);
        if (/^[A-Z]{2}$/.test(countryPart)) {
          setVatCountryCode(countryPart);
          setVatNumber(numberPart);
        } else {
          setVatNumber(fullVat);
        }
      } else {
        setVatNumber(fullVat);
      }
      setTaxNumber(financial.taxNumber || customer.taxNumber || '');
      setCreditLimit(String(financial.creditLimit || customer.creditLimit || 0));
      setDiscount(String(financial.discount || customer.discount || 0));
      setPaymentTerms(String(financial.paymentTerms || customer.paymentTerms || 30));

      setNotes(typeof customer.notes === 'string' ? customer.notes : '');

      // B2B Portal ayarları
      const b2bLogin = customer.b2bLogin || {};
      setB2bEnabled(!!b2bLogin.username || b2bLogin.isActive === true);
      setB2bUsername(b2bLogin.username || '');
      setB2bPassword(''); // Şifre gösterilmez
      setB2bCustomerType(b2bLogin.customerType || 'market');
      setB2bDiscount(String(b2bLogin.discount || 0));
      setB2bAllowedCategories(b2bLogin.allowedCategories || []);
      setB2bCategoryDiscounts(b2bLogin.categoryDiscounts || {});
      setB2bProductPrices(b2bLogin.productPrices || {});
      setB2bLanguage(b2bLogin.language || 'sl');
      setB2bPermissions(b2bLogin.permissions || {
        canOrder: true,
        canViewPrices: true,
        canViewBalance: true,
        canViewHistory: true,
      });
    } else {
      // Reset form
      setCode('');
      setName('');
      setType('company');
      setStatus('active');
      setCustomerGroup('standard');
      setEmail('');
      setPhone('');
      setMobile('');
      setWebsite('');
      setAddress('');
      setCity('');
      setPostalCode('');
      setCountry('SI');
      setVatCountryCode('SI');
      setVatNumber('');
      setTaxNumber('');
      setCreditLimit('0');
      setDiscount('0');
      setPaymentTerms('30');
      setNotes('');

      // B2B reset
      setB2bEnabled(false);
      setB2bUsername('');
      setB2bPassword('');
      setB2bCustomerType('market');
      setB2bDiscount('0');
      setB2bAllowedCategories([]);
      setB2bCategoryDiscounts({});
      setB2bProductPrices({});
      setB2bLanguage('sl');
      setB2bPermissions({
        canOrder: true,
        canViewPrices: true,
        canViewBalance: true,
        canViewHistory: true,
      });
    }
    setVatValidationResult(null);
  }, [customer, open]);

  // VIES VAT Validation
  const handleValidateVat = async () => {
    if (!vatNumber.trim() || vatNumber.length < 6) {
      alert('Gecerli bir VAT numarasi giriniz');
      return;
    }

    setValidatingVat(true);
    setVatValidationResult(null);

    try {
      // Ülke kodu + numara birleştir
      const fullVatNumber = vatCountryCode + vatNumber.trim();
      const result = await validateVATNumber(fullVatNumber);
      setVatValidationResult(result);

      if (result.valid) {
        // Set country from VAT
        if (result.countryCode) {
          setCountry(result.countryCode);
        }
      }

      if (result.valid && result.companyName) {
        // Auto-fill from VIES data
        if (!name.trim()) {
          setName(result.companyName);
        }

        // Parse address
        if (result.companyAddress) {
          const addressLines = result.companyAddress.split('\n').filter(Boolean);
          if (addressLines.length > 0) {
            // First line is usually street
            if (!address.trim()) {
              setAddress(addressLines[0]);
            }

            // Try to extract postal code and city from last line
            const lastLine = addressLines[addressLines.length - 1] || '';
            const postalMatch = lastLine.match(/\b(\d{4,6})\b/);
            if (postalMatch && !postalCode.trim()) {
              setPostalCode(postalMatch[1]);
              const cityPart = lastLine.replace(postalMatch[0], '').trim().replace(/^,?\s*/, '');
              if (cityPart && !city.trim()) {
                setCity(cityPart);
              }
            }
          }
        }

        // Set country from VAT
        if (result.countryCode) {
          setCountry(result.countryCode);
        }

        // Set type to corporate
        setType('company');
      }
    } catch (error) {
      setVatValidationResult({ valid: false, error: 'Dogrulama hatasi' });
    } finally {
      setValidatingVat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Müşteri adı zorunludur!');
      return;
    }

    // B2B validasyonu
    if (b2bEnabled) {
      const existingB2bUsername = customer?.b2bLogin?.username;

      if (!b2bUsername.trim()) {
        alert('B2B Portal aktif edildi ancak kullanıcı adı girilmedi!');
        return;
      }

      if (!existingB2bUsername && !b2bPassword.trim()) {
        alert('Yeni B2B hesabı için şifre girmelisiniz!');
        return;
      }
    }

    setLoading(true);

    try {
      // Python ERP yapısıyla uyumlu nested format
      const customerData = {
        basic: {
          code: code.trim() || generateCode(),
          name: name.trim(),
          type,
          status,
          customerGroup,
          vatNumber: vatNumber.trim() ? vatCountryCode + vatNumber.trim() : '',
          vatValidated: vatValidationResult?.valid || false,
          vatCountry: vatValidationResult?.countryCode || '',
          vatCompanyName: vatValidationResult?.companyName || '',
          vatCheckedAt: vatValidationResult?.valid ? new Date().toISOString() : '',
        },
        contact: {
          email: email.trim(),
          phone: phone.trim(),
          mobile: mobile.trim(),
          website: website.trim(),
          address: {
            street: address.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            country,
          },
        },
        financial: {
          currency: 'EUR',
          creditLimit: parseFloat(creditLimit) || 0,
          currentBalance: customer?.financial?.currentBalance || customer?.balance || 0,
          discount: parseFloat(discount) || 0,
          paymentTerms: parseInt(paymentTerms) || 30,
        },
        notes: (notes || '').trim(),
        isActive: true,
        updatedAt: new Date().toISOString(),
        // Partner tipi - müşteri olarak işaretle
        type: {
          isCustomer: true,
          isSupplier: false,
          isBoth: false,
        },
      };

      let partnerId = customer?.id;

      if (isEditMode) {
        await updateData(`partners/${customer.id}`, customerData);
      } else {
        (customerData as any).createdAt = new Date().toISOString();
        partnerId = await pushData('partners', customerData);
      }

      // B2B hesabı oluştur/güncelle
      if (b2bEnabled && b2bUsername.trim() && partnerId) {
        // Sadece değer girilmiş kategori indirimlerini kaydet
        const cleanCategoryDiscounts: Record<string, number> = {};
        Object.entries(b2bCategoryDiscounts).forEach(([cat, disc]) => {
          if (disc > 0) cleanCategoryDiscounts[cat] = disc;
        });

        const b2bData: any = {
          customerType: b2bCustomerType,
          discount: parseFloat(b2bDiscount) || 0,
          allowedCategories: b2bAllowedCategories,
          categoryDiscounts: cleanCategoryDiscounts,
          productPrices: b2bProductPrices,
          language: b2bLanguage,
          permissions: b2bPermissions,
          isActive: true,
          updatedAt: new Date().toISOString(),
        };

        const existingB2bUsername = customer?.b2bLogin?.username;

        // Yeni hesap oluşturma (şifre gerekli)
        if (b2bPassword.trim()) {
          await createB2BAccount(
            b2bUsername.trim().toLowerCase(),
            b2bPassword,
            partnerId,
            name,
            b2bPermissions,
            'ADMIN'
          );
        }

        // B2B ayarlarını kaydet
        // Username'i de b2bData'ya ekle
        b2bData.username = b2bUsername.trim().toLowerCase();
        await updateData(`partners/${partnerId}/b2bLogin`, b2bData);
      }

      onSave?.();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      alert('Kayıt hatası: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `CUST-${timestamp}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditMode ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
              <TabsTrigger value="finance">Finans</TabsTrigger>
              <TabsTrigger value="b2b" className="flex items-center gap-1">
                <Store className="h-3 w-3" />
                B2B Portal
              </TabsTrigger>
            </TabsList>

            {/* TEMEL BİLGİLER TAB */}
            <TabsContent value="basic" className="space-y-4 mt-4">
          {/* EU VAT Dogrulama Bolumu - En ustte */}
          <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-sm font-medium flex items-center gap-2 text-amber-800">
              <Shield className="h-4 w-4" />
              EU VAT Dogrulama (VIES)
            </h3>
            <div className="flex gap-2">
              {/* Ülke Seçimi */}
              <Select
                value={vatCountryCode}
                onValueChange={(value) => {
                  setVatCountryCode(value);
                  setVatValidationResult(null);
                }}
                disabled={viewMode}
              >
                <SelectTrigger className="w-[130px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* VAT Numarası */}
              <div className="flex-1">
                <Input
                  value={vatNumber}
                  onChange={(e) => {
                    setVatNumber(e.target.value.replace(/\s/g, '').toUpperCase());
                    setVatValidationResult(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (vatNumber.trim() && !validatingVat && !viewMode) {
                        handleValidateVat();
                      }
                    }
                  }}
                  placeholder="12345678"
                  className="bg-white"
                  disabled={viewMode}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleValidateVat}
                disabled={validatingVat || viewMode || !vatNumber.trim()}
                className="bg-white"
              >
                {validatingVat ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Dogrula
              </Button>
            </div>
            {vatValidationResult && (
              <div className={`p-3 rounded-lg text-sm ${
                vatValidationResult.valid
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {vatValidationResult.valid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {vatValidationResult.valid ? 'VAT Numarasi Gecerli' : 'VAT Numarasi Gecersiz'}
                  </span>
                </div>
                {vatValidationResult.companyName && (
                  <div className="mt-2 text-xs">
                    <div><strong>Sirket:</strong> {vatValidationResult.companyName}</div>
                    {vatValidationResult.companyAddress && (
                      <div><strong>Adres:</strong> {vatValidationResult.companyAddress}</div>
                    )}
                  </div>
                )}
                {vatValidationResult.error && (
                  <div className="mt-1 text-xs">{vatValidationResult.error}</div>
                )}
              </div>
            )}
          </div>

          {/* Temel Bilgiler */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Temel Bilgiler
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Müşteri Kodu</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Otomatik oluşturulur"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Müşteri Adı *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Firma veya kişi adı"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Müşteri Türü</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Kurumsal</SelectItem>
                    <SelectItem value="individual">Bireysel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Durum</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Pasif</SelectItem>
                    <SelectItem value="blocked">Blokeli</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="customerGroup">Müşteri Grubu</Label>
                <Select value={customerGroup} onValueChange={setCustomerGroup}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standart</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="wholesale">Toptan</SelectItem>
                    <SelectItem value="retail">Perakende</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* İletişim Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              İletişim Bilgileri
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@firma.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+386 1 234 5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobil</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+386 40 123 456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="www.firma.com"
                />
              </div>
            </div>
          </div>

          {/* Adres Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Adres Bilgileri
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sokak, numara"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Şehir</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ljubljana"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Posta Kodu</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="country">Ülke</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Müşteri ile ilgili notlar..."
              rows={2}
            />
          </div>
            </TabsContent>

            {/* FİNANS TAB */}
            <TabsContent value="finance" className="space-y-4 mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Finansal Bilgiler
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Kredi Limiti (€)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">İskonto (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="paymentTerms">Ödeme Vadesi (Gün)</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Peşin</SelectItem>
                    <SelectItem value="7">7 Gün</SelectItem>
                    <SelectItem value="15">15 Gün</SelectItem>
                    <SelectItem value="30">30 Gün</SelectItem>
                    <SelectItem value="45">45 Gün</SelectItem>
                    <SelectItem value="60">60 Gün</SelectItem>
                    <SelectItem value="90">90 Gün</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
            </TabsContent>

            {/* B2B PORTAL TAB */}
            <TabsContent value="b2b" className="space-y-4 mt-4">
              {/* B2B Aktif/Pasif */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">B2B Portal Erişimi</p>
                    <p className="text-sm text-blue-700">Müşterinin online sipariş portalına erişimi</p>
                  </div>
                </div>
                <Switch
                  checked={b2bEnabled}
                  onCheckedChange={setB2bEnabled}
                />
              </div>

              {b2bEnabled && (
                <>
                  {/* Giriş Bilgileri */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Giriş Bilgileri
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kullanıcı Adı</Label>
                        <Input
                          value={b2bUsername}
                          onChange={(e) => setB2bUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                          placeholder="ornek.market"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{customer?.b2bLogin?.username ? 'Yeni Şifre (değiştirmek için)' : 'Şifre'}</Label>
                        <Input
                          type="password"
                          value={b2bPassword}
                          onChange={(e) => setB2bPassword(e.target.value)}
                          placeholder={customer?.b2bLogin?.username ? '••••••••' : 'Şifre girin'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Müşteri Tipi */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Müşteri Tipi
                    </h4>
                    <Select value={b2bCustomerType} onValueChange={(v: 'market' | 'kasap' | 'both') => setB2bCustomerType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market (Tüm ürünler)</SelectItem>
                        <SelectItem value="kasap">Kasap (Et ürünleri odaklı)</SelectItem>
                        <SelectItem value="both">Her İkisi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* İskonto */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      B2B Özel İskonto
                    </h4>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={b2bDiscount}
                        onChange={(e) => setB2bDiscount(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">% indirim (tüm ürünlere uygulanır)</span>
                    </div>
                  </div>

                  {/* Birleşik Görünürlük ve İndirim Yönetimi */}
                  <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                          <Tags className="h-4 w-4" />
                          Ürün Görünürlüğü ve İndirimler
                        </h4>
                        <p className="text-xs text-blue-700 mt-1">
                          Kategori ve ürün bazlı erişim kontrolü ve özel indirimler
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {b2bAllowedCategories.length === 0 ? 'Tümü görünür' : `${b2bAllowedCategories.length} kategori`}
                        </span>
                        {Object.keys(b2bProductPrices).length > 0 && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            +{Object.keys(b2bProductPrices).length} ürün
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hızlı Eylemler */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Tümünü seç
                          setB2bAllowedCategories(CATEGORIES.map(c => c.code));
                        }}
                        className="bg-white text-xs h-7"
                      >
                        Tümünü Seç
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Tümünü kaldır (tümü görünür hale gelir)
                          setB2bAllowedCategories([]);
                          setB2bCategoryDiscounts({});
                        }}
                        className="bg-white text-xs h-7"
                      >
                        Sıfırla
                      </Button>
                      {parseFloat(b2bDiscount) > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Genel: %{b2bDiscount}
                        </span>
                      )}
                    </div>

                    {/* Kategori Tablosu */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                      {/* Tablo Başlığı */}
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 border-b text-xs font-medium text-gray-600">
                        <div className="col-span-1 flex items-center justify-center">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </div>
                        <div className="col-span-7">Kategori</div>
                        <div className="col-span-4 text-center">İndirim %</div>
                      </div>

                      {/* Kategori Listesi */}
                      <div className="max-h-56 overflow-y-auto">
                        {CATEGORIES.map((cat) => {
                          // Boş array = tüm kategoriler görünür, dolu array = sadece seçilenler görünür
                          const isVisible = b2bAllowedCategories.length === 0 || b2bAllowedCategories.includes(cat.code);
                          const categoryDiscount = b2bCategoryDiscounts[cat.code] || 0;
                          const hasCustomDiscount = categoryDiscount > 0;
                          const CatIcon = cat.icon;

                          return (
                            <div
                              key={cat.code}
                              className={`grid grid-cols-12 gap-2 px-3 py-2 border-b last:border-b-0 items-center transition-colors ${
                                isVisible ? 'bg-white hover:bg-blue-50/50' : 'bg-gray-50 opacity-60'
                              }`}
                            >
                              {/* Görünürlük Toggle */}
                              <div className="col-span-1 flex items-center justify-center">
                                <Checkbox
                                  checked={isVisible}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      // Kategoriyi aç
                                      if (b2bAllowedCategories.length === 0) {
                                        // Tümü görünür durumdayken bir tane açmak mantıksız, zaten açık
                                        // Bu durumda bir şey yapma
                                      } else {
                                        // Listeye ekle
                                        setB2bAllowedCategories([...b2bAllowedCategories, cat.code]);
                                      }
                                    } else {
                                      // Kategoriyi kapat
                                      if (b2bAllowedCategories.length === 0) {
                                        // Tümü görünür durumdayken bir tane kapatıyoruz
                                        // Bu kategorihariç tüm kategorileri seç
                                        setB2bAllowedCategories(CATEGORIES.filter(c => c.code !== cat.code).map(c => c.code));
                                      } else {
                                        // Listeden çıkar
                                        const newCategories = b2bAllowedCategories.filter(c => c !== cat.code);
                                        setB2bAllowedCategories(newCategories);
                                      }
                                      // İndirimi de temizle
                                      const newDiscounts = { ...b2bCategoryDiscounts };
                                      delete newDiscounts[cat.code];
                                      setB2bCategoryDiscounts(newDiscounts);
                                    }
                                  }}
                                  className="h-4 w-4"
                                />
                              </div>

                              {/* Kategori Adı */}
                              <div className="col-span-7 flex items-center gap-2">
                                {CatIcon && <CatIcon className={`h-4 w-4 ${cat.color || 'text-gray-500'}`} />}
                                <span className={`text-sm ${isVisible ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {cat.nameTR}
                                </span>
                                {hasCustomDiscount && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">
                                    Özel
                                  </span>
                                )}
                              </div>

                              {/* İndirim Girişi */}
                              <div className="col-span-4 flex items-center justify-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={categoryDiscount || ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (val > 0) {
                                      setB2bCategoryDiscounts({
                                        ...b2bCategoryDiscounts,
                                        [cat.code]: val
                                      });
                                    } else {
                                      const newDiscounts = { ...b2bCategoryDiscounts };
                                      delete newDiscounts[cat.code];
                                      setB2bCategoryDiscounts(newDiscounts);
                                    }
                                  }}
                                  placeholder={b2bDiscount || '0'}
                                  disabled={!isVisible}
                                  className="w-16 h-7 text-center text-sm"
                                />
                                <span className="text-xs text-gray-400">%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Özet Bilgisi */}
                    <div className="flex flex-wrap gap-3 text-xs">
                      {b2bAllowedCategories.length > 0 && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {b2bAllowedCategories.length} / {CATEGORIES.length} kategori görünür
                        </span>
                      )}
                      {Object.keys(b2bCategoryDiscounts).filter(k => b2bCategoryDiscounts[k] > 0).length > 0 && (
                        <span className="text-green-600 flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {Object.keys(b2bCategoryDiscounts).filter(k => b2bCategoryDiscounts[k] > 0).length} kategoride özel indirim
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ürün Özel Fiyatları - Ayrı Bölüm */}
                  <div className="space-y-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-orange-900">
                          <Package className="h-4 w-4" />
                          Ürün Bazlı Özel Fiyatlandırma
                        </h4>
                        <p className="text-xs text-orange-700 mt-1">
                          Belirli ürünlere özel fiyat veya indirim uygulayın
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={showProductPrices ? "default" : "outline"}
                        size="sm"
                        onClick={async () => {
                          setShowProductPrices(!showProductPrices);
                          if (allProducts.length === 0) {
                            setLoadingProducts(true);
                            try {
                              const productsData = await getData('products');
                              if (productsData) {
                                const productsList = Object.entries(productsData).map(([id, data]: [string, any]) => ({
                                  id,
                                  ...data
                                }));
                                setAllProducts(productsList);
                              }
                            } catch (err) {
                              console.error('Ürünler yüklenemedi:', err);
                            } finally {
                              setLoadingProducts(false);
                            }
                          }
                        }}
                        className={showProductPrices ? "bg-orange-600 hover:bg-orange-700" : "bg-white"}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {Object.keys(b2bProductPrices).length > 0
                          ? `${Object.keys(b2bProductPrices).length} ürün ayarlı`
                          : 'Ürün Ekle'}
                      </Button>
                    </div>

                    {/* Ürün listesi ve arama */}
                    {showProductPrices && (
                      <div className="space-y-3 border-t border-orange-200 pt-3">
                        {/* Arama */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Ürün ara (ad veya kod)..."
                            className="pl-9 bg-white"
                          />
                          {productSearch && (
                            <button
                              type="button"
                              onClick={() => setProductSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            </button>
                          )}
                        </div>

                        {/* Seçili ürünler tablosu */}
                        {Object.keys(b2bProductPrices).length > 0 && (
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 border-b text-xs font-medium text-gray-600">
                              <div className="col-span-5">Ürün</div>
                              <div className="col-span-3 text-center">Özel Fiyat</div>
                              <div className="col-span-3 text-center">İndirim %</div>
                              <div className="col-span-1"></div>
                            </div>
                            <div className="max-h-40 overflow-y-auto">
                              {Object.entries(b2bProductPrices).map(([productId, priceData]) => {
                                const product = allProducts.find(p => p.id === productId);
                                return (
                                  <div key={productId} className="grid grid-cols-12 gap-2 px-3 py-2 border-b last:border-b-0 items-center hover:bg-orange-50/50">
                                    <div className="col-span-5 flex items-center gap-2">
                                      <Package className="h-4 w-4 text-orange-400 flex-shrink-0" />
                                      <span className="text-sm truncate" title={product?.name || productId}>
                                        {product?.name || productId}
                                      </span>
                                    </div>
                                    <div className="col-span-3 flex items-center justify-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={priceData.price || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          setB2bProductPrices({
                                            ...b2bProductPrices,
                                            [productId]: { ...priceData, price: val || undefined }
                                          });
                                        }}
                                        placeholder={product?.price?.toFixed(2) || '0'}
                                        className="w-20 h-7 text-center text-sm"
                                      />
                                      <span className="text-xs text-gray-400">€</span>
                                    </div>
                                    <div className="col-span-3 flex items-center justify-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={priceData.discount || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          setB2bProductPrices({
                                            ...b2bProductPrices,
                                            [productId]: { ...priceData, discount: val || undefined }
                                          });
                                        }}
                                        placeholder="0"
                                        className="w-14 h-7 text-center text-sm"
                                      />
                                      <span className="text-xs text-gray-400">%</span>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newPrices = { ...b2bProductPrices };
                                          delete newPrices[productId];
                                          setB2bProductPrices(newPrices);
                                        }}
                                        className="p-1 hover:bg-red-100 rounded transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Ürün arama sonuçları */}
                        {loadingProducts ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                            <span className="ml-2 text-sm text-gray-500">Ürünler yükleniyor...</span>
                          </div>
                        ) : productSearch.length >= 2 ? (
                          <div className="bg-white rounded-lg border max-h-48 overflow-y-auto">
                            {allProducts
                              .filter(p =>
                                !b2bProductPrices[p.id] &&
                                (p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                 p.code?.toLowerCase().includes(productSearch.toLowerCase()))
                              )
                              .slice(0, 20)
                              .map(product => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => {
                                    setB2bProductPrices({
                                      ...b2bProductPrices,
                                      [product.id]: { discount: 0 }
                                    });
                                    setProductSearch('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-orange-50 border-b last:border-b-0 transition-colors"
                                >
                                  <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium block truncate">{product.name}</span>
                                    {product.code && (
                                      <span className="text-xs text-gray-500">{product.code}</span>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-600 font-medium">€{product.price?.toFixed(2)}</span>
                                </button>
                              ))}
                            {allProducts.filter(p =>
                              !b2bProductPrices[p.id] &&
                              (p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                               p.code?.toLowerCase().includes(productSearch.toLowerCase()))
                            ).length === 0 && (
                              <p className="text-sm text-gray-500 text-center py-4">Ürün bulunamadı</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 text-center py-3 bg-white rounded-lg border border-dashed">
                            En az 2 karakter yazarak ürün arayın
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dil ve Yetkiler - Yan Yana */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dil */}
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <span className="text-lg">
                          {B2B_LANGUAGES.find(l => l.code === b2bLanguage)?.flag || '🌐'}
                        </span>
                        Portal Dili
                      </h4>
                      <Select value={b2bLanguage} onValueChange={(v: B2BLanguage) => setB2bLanguage(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {B2B_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Yetkiler */}
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Yetkiler
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={b2bPermissions.canOrder}
                            onCheckedChange={(c) => setB2bPermissions({...b2bPermissions, canOrder: !!c})}
                          />
                          <span>Sipariş</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={b2bPermissions.canViewPrices}
                            onCheckedChange={(c) => setB2bPermissions({...b2bPermissions, canViewPrices: !!c})}
                          />
                          <span>Fiyatlar</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={b2bPermissions.canViewBalance}
                            onCheckedChange={(c) => setB2bPermissions({...b2bPermissions, canViewBalance: !!c})}
                          />
                          <span>Bakiye</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={b2bPermissions.canViewHistory}
                            onCheckedChange={(c) => setB2bPermissions({...b2bPermissions, canViewHistory: !!c})}
                          />
                          <span>Geçmiş</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Güncelle' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
