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
import { pushData, updateData } from '@/services/firebase';
import { Loader2, Building2, User, CreditCard, MapPin, Phone, Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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

      setNotes(customer.notes || '');
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
        notes: notes.trim(),
        isActive: true,
        updatedAt: new Date().toISOString(),
        // Partner tipi - müşteri olarak işaretle
        type: {
          isCustomer: true,
          isSupplier: false,
          isBoth: false,
        },
      };

      if (isEditMode) {
        await updateData(`partners/${customer.id}`, customerData);
      } else {
        (customerData as any).createdAt = new Date().toISOString();
        await pushData('partners', customerData);
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

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Finansal Bilgiler */}
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

          {/* Notlar */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Müşteri ile ilgili notlar..."
              rows={3}
            />
          </div>

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
