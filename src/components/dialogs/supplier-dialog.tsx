'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { pushData, updateData } from '@/services/firebase';
import { Loader2, CheckCircle2, XCircle, Globe } from 'lucide-react';

// Country options
const COUNTRIES = [
  { code: 'SI', label: 'Slovenya (SI)' },
  { code: 'AT', label: 'Avusturya (AT)' },
  { code: 'DE', label: 'Almanya (DE)' },
  { code: 'IT', label: 'Italya (IT)' },
  { code: 'HR', label: 'Hirvatistan (HR)' },
  { code: 'HU', label: 'Macaristan (HU)' },
  { code: 'CZ', label: 'Cek Cumhuriyeti (CZ)' },
  { code: 'PL', label: 'Polonya (PL)' },
  { code: 'FR', label: 'Fransa (FR)' },
  { code: 'NL', label: 'Hollanda (NL)' },
  { code: 'BE', label: 'Belcika (BE)' },
];

// Supplier types
const SUPPLIER_TYPES = [
  { value: 'wholesaler', label: 'Toptanci' },
  { value: 'manufacturer', label: 'Uretici' },
  { value: 'distributor', label: 'Distributor' },
];

// Currencies
const CURRENCIES = ['EUR', 'USD', 'GBP', 'TRY'];

// VAT rates
const VAT_RATES = ['0', '5', '9.5', '22'];

interface Supplier {
  id: string;
  basic?: {
    name?: string;
    shortName?: string;
    country?: string;
    type?: string;
    isActive?: boolean;
    categories?: string[];
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
    };
    contactPerson?: {
      name?: string;
      phone?: string;
    };
  };
  payment?: {
    currentBalance?: number;
    paymentTermDays?: number;
    currency?: string;
    bankDetails?: {
      bankName?: string;
      iban?: string;
    };
  };
  tax?: {
    taxId?: string;
    reverseCharge?: boolean;
    defaultVatRate?: number;
    vies_validated?: boolean;
    vies_validation_date?: string;
    vies_company_name?: string;
  };
  shipping?: {
    transportIncluded?: boolean;
    transportFee?: number;
    minOrderAmount?: number;
  };
  settings?: {
    notes?: string;
  };
  // Flat structure support
  name?: string;
  country?: string;
}

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSave?: () => void;
}

// Helper to get field from nested or flat structure
function getField<T>(supplier: Supplier | null, nestedPath: string[], flatKey: string, defaultVal: T): T {
  if (!supplier) return defaultVal;

  // Try nested first
  let value: any = supplier;
  for (const key of nestedPath) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = undefined;
      break;
    }
  }
  if (value !== undefined && value !== null) return value as T;

  // Try flat
  const flatValue = (supplier as any)[flatKey];
  if (flatValue !== undefined && flatValue !== null) return flatValue as T;

  return defaultVal;
}

export function SupplierDialog({ open, onOpenChange, supplier, onSave }: SupplierDialogProps) {
  const isEditMode = !!supplier;

  // VAT validation state
  const [vatCountryCode, setVatCountryCode] = useState('SI');
  const [vatNumber, setVatNumber] = useState('');
  const [vatValidating, setVatValidating] = useState(false);
  const [vatResult, setVatResult] = useState<{
    valid: boolean;
    message: string;
    companyName?: string;
    companyAddress?: string;
  } | null>(null);

  // Basic info
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [country, setCountry] = useState('SI');
  const [type, setType] = useState('wholesaler');
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState('');
  const [taxId, setTaxId] = useState('');
  const [reverseCharge, setReverseCharge] = useState(false);

  // Contact info
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Payment info
  const [paymentTermDays, setPaymentTermDays] = useState('30');
  const [currency, setCurrency] = useState('EUR');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [defaultVatRate, setDefaultVatRate] = useState('9.5');

  // Shipping info
  const [transportIncluded, setTransportIncluded] = useState(false);
  const [transportFee, setTransportFee] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');

  // Settings
  const [notes, setNotes] = useState('');

  // Saving state
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (supplier) {
        // Edit mode - load existing data
        setName(getField(supplier, ['basic', 'name'], 'name', ''));
        setShortName(getField(supplier, ['basic', 'shortName'], 'shortName', ''));
        setCountry(getField(supplier, ['basic', 'country'], 'country', 'SI'));
        setType(getField(supplier, ['basic', 'type'], 'type', 'wholesaler'));
        setIsActive(getField(supplier, ['basic', 'isActive'], 'isActive', true));
        setCategories((getField<string[]>(supplier, ['basic', 'categories'], 'categories', [])).join(', '));
        setTaxId(getField(supplier, ['tax', 'taxId'], 'taxId', ''));
        setReverseCharge(getField(supplier, ['tax', 'reverseCharge'], 'reverseCharge', false));

        setStreet(getField(supplier, ['contact', 'address', 'street'], 'street', ''));
        setCity(getField(supplier, ['contact', 'address', 'city'], 'city', ''));
        setPostalCode(getField(supplier, ['contact', 'address', 'postalCode'], 'postalCode', ''));
        setPhone(getField(supplier, ['contact', 'phone'], 'phone', ''));
        setEmail(getField(supplier, ['contact', 'email'], 'email', ''));
        setContactPerson(getField(supplier, ['contact', 'contactPerson', 'name'], 'contactPersonName', ''));
        setContactPhone(getField(supplier, ['contact', 'contactPerson', 'phone'], 'contactPersonPhone', ''));

        setPaymentTermDays(String(getField(supplier, ['payment', 'paymentTermDays'], 'paymentTermDays', 30)));
        setCurrency(getField(supplier, ['payment', 'currency'], 'currency', 'EUR'));
        setBankName(getField(supplier, ['payment', 'bankDetails', 'bankName'], 'bankName', ''));
        setIban(getField(supplier, ['payment', 'bankDetails', 'iban'], 'iban', ''));
        setDefaultVatRate(String(getField(supplier, ['tax', 'defaultVatRate'], 'defaultVatRate', 9.5)));

        setTransportIncluded(getField(supplier, ['shipping', 'transportIncluded'], 'transportIncluded', false));
        setTransportFee(String(getField(supplier, ['shipping', 'transportFee'], 'transportFee', 0) || ''));
        setMinOrderAmount(String(getField(supplier, ['shipping', 'minOrderAmount'], 'minOrderAmount', 0) || ''));

        setNotes(getField(supplier, ['settings', 'notes'], 'notes', ''));

        // VAT input for validation - ülke kodu ve numarayı ayır
        const fullVat = getField<string>(supplier, ['tax', 'taxId'], 'taxId', '');
        if (fullVat && typeof fullVat === 'string' && fullVat.length >= 2) {
          const countryPart = fullVat.substring(0, 2).toUpperCase();
          const numberPart = fullVat.substring(2);
          if (/^[A-Z]{2}$/.test(countryPart)) {
            setVatCountryCode(countryPart);
            setVatNumber(numberPart);
          } else {
            setVatNumber(fullVat);
          }
        } else if (fullVat) {
          setVatNumber(String(fullVat));
        }

        // Show previous VIES validation if exists
        if (getField(supplier, ['tax', 'vies_validated'], 'vies_validated', false)) {
          setVatResult({
            valid: true,
            message: 'Onceden dogrulanmis',
            companyName: getField(supplier, ['tax', 'vies_company_name'], 'vies_company_name', undefined),
          });
        }
      } else {
        // New supplier - reset form
        setName('');
        setShortName('');
        setCountry('SI');
        setType('wholesaler');
        setIsActive(true);
        setCategories('');
        setTaxId('');
        setReverseCharge(false);
        setStreet('');
        setCity('');
        setPostalCode('');
        setPhone('');
        setEmail('');
        setContactPerson('');
        setContactPhone('');
        setPaymentTermDays('30');
        setCurrency('EUR');
        setBankName('');
        setIban('');
        setDefaultVatRate('9.5');
        setTransportIncluded(false);
        setTransportFee('');
        setMinOrderAmount('');
        setNotes('');
        setVatCountryCode('SI');
        setVatNumber('');
        setVatResult(null);
      }
    }
  }, [open, supplier]);

  // VAT Validation
  const handleVatValidation = async () => {
    if (!vatNumber.trim() || vatNumber.length < 6) return;

    setVatValidating(true);
    setVatResult(null);

    try {
      // Ülke kodu + numara birleştir
      const fullVatNumber = vatCountryCode + vatNumber.replace(/\s/g, '').toUpperCase();
      const countryCode = vatCountryCode;

      // Call VIES service (uses CORS proxy)
      const { validateVATNumber } = await import('@/lib/vies');
      const result = await validateVATNumber(fullVatNumber);

      if (result.valid) {
        const companyName = result.companyName || '';
        const companyAddress = result.companyAddress || '';

        setVatResult({
          valid: true,
          message: 'VAT numarasi dogrulandi',
          companyName,
          companyAddress,
        });

        // Auto-fill form with validated data
        if (companyName) {
          setName(companyName);
          setShortName(companyName.substring(0, 30));
        }

        // Set country from VAT
        const countryOption = COUNTRIES.find((c) => c.code === countryCode);
        if (countryOption) {
          setCountry(countryCode);
        }

        // Parse address
        if (companyAddress) {
          const addressParts = companyAddress.split(', ');
          if (addressParts.length >= 1) setStreet(addressParts[0]);
          if (addressParts.length >= 2) {
            const cityPart = addressParts[addressParts.length - 1];
            const postalMatch = cityPart.match(/^(\d+)\s+(.+)$/);
            if (postalMatch) {
              setPostalCode(postalMatch[1]);
              setCity(postalMatch[2]);
            } else {
              setCity(cityPart);
            }
          }
        }

        // Set tax ID
        setTaxId(fullVatNumber);

        // Set reverse charge for non-SI EU suppliers
        if (countryCode !== 'SI') {
          setReverseCharge(true);
        }
      } else {
        setVatResult({
          valid: false,
          message: result.error || 'Gecersiz VAT numarasi - VIES sisteminde bulunamadi',
        });
      }
    } catch (error) {
      setVatResult({
        valid: false,
        message: 'VIES servisi hata verdi: ' + (error as Error).message,
      });
    } finally {
      setVatValidating(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Lutfen tedarikci adi girin!');
      return;
    }

    if (email && !email.includes('@')) {
      alert('Gecersiz email adresi!');
      return;
    }

    setSaving(true);
    try {
      const supplierData = {
        // Partner tipi - tedarikçi olarak işaretle
        type: {
          isCustomer: false,
          isSupplier: true,
          isBoth: false,
        },
        basic: {
          name: name.trim(),
          shortName: shortName.trim() || name.trim().substring(0, 30),
          country,
          type: type, // wholesaler, manufacturer, distributor
          isActive,
          categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
          // Legacy support
          partnerTypes: {
            isCustomer: false,
            isSupplier: true,
          },
        },
        contact: {
          address: {
            street: street.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
          },
          phone: phone.trim(),
          email: email.trim(),
          contactPerson: {
            name: contactPerson.trim(),
            phone: contactPhone.trim(),
          },
        },
        payment: {
          paymentTermDays: parseInt(paymentTermDays) || 30,
          currency,
          bankDetails: {
            bankName: bankName.trim(),
            iban: iban.trim(),
          },
        },
        tax: {
          taxId: taxId.trim(),
          reverseCharge,
          defaultVatRate: parseFloat(defaultVatRate) || 9.5,
          ...(vatResult?.valid && {
            vies_validated: true,
            vies_validation_date: new Date().toISOString(),
            vies_company_name: vatResult.companyName,
          }),
        },
        shipping: {
          transportIncluded,
          transportFee: parseFloat(transportFee) || 0,
          minOrderAmount: parseFloat(minOrderAmount) || 0,
        },
        settings: {
          notes: notes.trim(),
        },
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && supplier?.id) {
        // partners koleksiyonuna kaydet
        await updateData(`partners/${supplier.id}`, supplierData);
      } else {
        // partners koleksiyonuna yeni tedarikçi ekle
        await pushData('partners', {
          ...supplierData,
          createdAt: new Date().toISOString(),
        });
      }

      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      alert('Kaydetme hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? 'Tedarikci Duzenle' : 'Yeni Tedarikci'}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode
              ? 'Tedarikci bilgilerini guncelleyin'
              : 'Yeni tedarikci eklemek icin formu doldurun'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* VAT Validation Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">AB VAT Numarasi Dogrulama</h3>
            </div>
            <p className="text-sm text-amber-700 mb-4">
              Sirket bilgilerini otomatik doldurmak icin AB VAT numarasi ile baslayin
            </p>
            <div className="flex gap-2">
              {/* Ülke Seçimi */}
              <Select
                value={vatCountryCode}
                onValueChange={(value) => {
                  setVatCountryCode(value);
                  setVatResult(null);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* VAT Numarası */}
              <div className="flex-1">
                <Input
                  placeholder="12345678"
                  value={vatNumber}
                  onChange={(e) => {
                    setVatNumber(e.target.value.replace(/\s/g, '').toUpperCase());
                    setVatResult(null);
                  }}
                />
              </div>
              <Button
                onClick={handleVatValidation}
                disabled={vatValidating || !vatNumber.trim()}
                className="min-w-[130px]"
              >
                {vatValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Dogrulaniyor...
                  </>
                ) : (
                  'Dogrula'
                )}
              </Button>
            </div>

            {vatResult && (
              <div
                className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  vatResult.valid
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {vatResult.valid ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium">{vatResult.message}</p>
                  {vatResult.companyName && (
                    <p className="text-sm mt-1">Sirket: {vatResult.companyName}</p>
                  )}
                  {vatResult.companyAddress && (
                    <p className="text-sm">Adres: {vatResult.companyAddress}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
              <TabsTrigger value="contact">Iletisim</TabsTrigger>
              <TabsTrigger value="payment">Odeme & Finans</TabsTrigger>
              <TabsTrigger value="shipping">Nakliye</TabsTrigger>
              <TabsTrigger value="settings">Ayarlar</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tedarikci Adi *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Orn: ABC Trading GmbH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortName">Kisa Isim</Label>
                  <Input
                    id="shortName"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="Orn: ABC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Ulke *</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ulke secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tip</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tip secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">VAT/Vergi Numarasi</Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                    placeholder="Orn: SI12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categories">Kategoriler</Label>
                  <Input
                    id="categories"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    placeholder="Orn: Et, Tavuk, Sakatatlar (virgul ile)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked as boolean)}
                  />
                  <Label htmlFor="isActive" className="font-normal">
                    Aktif Tedarikci
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reverseCharge"
                    checked={reverseCharge}
                    onCheckedChange={(checked) => setReverseCharge(checked as boolean)}
                  />
                  <Label htmlFor="reverseCharge" className="font-normal">
                    Reverse Charge (AB Tedarikcisi)
                  </Label>
                </div>
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 border-b pb-2">Adres Bilgileri</h4>
                <div className="space-y-2">
                  <Label htmlFor="street">Cadde/Sokak</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Orn: Hauptstrasse 123"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Sehir</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Orn: Ljubljana"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Posta Kodu</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Orn: 1000"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 border-b pb-2">Iletisim Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Orn: +386 1 234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Orn: info@tedarikci.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Irtibat Kisisi</Label>
                    <Input
                      id="contactPerson"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Orn: Ahmet Yilmaz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Irtibat Telefonu</Label>
                    <Input
                      id="contactPhone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Orn: +386 40 123 456"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Payment Tab */}
            <TabsContent value="payment" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 border-b pb-2">Odeme Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentTermDays">Odeme Vadesi (gun)</Label>
                    <Input
                      id="paymentTermDays"
                      type="number"
                      value={paymentTermDays}
                      onChange={(e) => setPaymentTermDays(e.target.value)}
                      min="0"
                      max="365"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Para Birimi</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Para birimi secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Banka Adi</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Orn: Nova KBM"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="Orn: SI56 0110 0100 0123 456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatRate">Varsayilan KDV Orani (%)</Label>
                  <Select value={defaultVatRate} onValueChange={setDefaultVatRate}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="KDV orani secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_RATES.map((r) => (
                        <SelectItem key={r} value={r}>
                          %{r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Balance info (read-only in edit mode) */}
              {isEditMode && supplier?.payment?.currentBalance !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Bakiye Durumu</h4>
                  <p className={`text-2xl font-bold ${
                    (supplier.payment.currentBalance || 0) > 0
                      ? 'text-red-600'
                      : (supplier.payment.currentBalance || 0) < 0
                        ? 'text-green-600'
                        : ''
                  }`}>
                    {(supplier.payment.currentBalance || 0).toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: currency,
                    })}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Shipping Tab */}
            <TabsContent value="shipping" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 border-b pb-2">Nakliye Bilgileri</h4>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="transportIncluded"
                    checked={transportIncluded}
                    onCheckedChange={(checked) => setTransportIncluded(checked as boolean)}
                  />
                  <Label htmlFor="transportIncluded" className="font-normal">
                    Nakliye Ucreti Dahil
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transportFee">Nakliye Ucreti (EUR)</Label>
                    <Input
                      id="transportFee"
                      type="number"
                      step="0.01"
                      value={transportFee}
                      onChange={(e) => setTransportFee(e.target.value)}
                      disabled={transportIncluded}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">Minimum Siparis (EUR)</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      step="0.01"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 border-b pb-2">Diger Ayarlar</h4>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tedarikci hakkinda notlar..."
                    rows={5}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Iptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Tedarikciyi Kaydet'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
