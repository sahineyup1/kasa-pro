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
import { addFirestoreData, updateFirestoreData } from '@/services/firebase';
import { Loader2, Building2, User, CreditCard, MapPin, Phone } from 'lucide-react';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
  onSave?: () => void;
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
  onSave,
}: CustomerDialogProps) {
  const isEditMode = !!customer?.id;
  const [loading, setLoading] = useState(false);

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

      setVatNumber(financial.vatNumber || customer.vatNumber || '');
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
      setVatNumber('');
      setTaxNumber('');
      setCreditLimit('0');
      setDiscount('0');
      setPaymentTerms('30');
      setNotes('');
    }
  }, [customer, open]);

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
        },
        contact: {
          email: email.trim(),
          phone: phone.trim(),
          mobile: mobile.trim(),
          website: website.trim(),
        },
        addressInfo: {
          street: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country,
        },
        financial: {
          vatNumber: vatNumber.trim(),
          taxNumber: taxNumber.trim(),
          creditLimit: parseFloat(creditLimit) || 0,
          discount: parseFloat(discount) || 0,
          paymentTerms: parseInt(paymentTerms) || 30,
          balance: customer?.financial?.balance || customer?.balance || 0,
        },
        notes: notes.trim(),
        isActive: true,
      };

      if (isEditMode) {
        await updateFirestoreData('customers', customer.id, customerData);
      } else {
        await addFirestoreData('customers', customerData);
      }

      onSave?.();
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
                <Label htmlFor="vatNumber">VAT Numarası</Label>
                <Input
                  id="vatNumber"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="SI12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxNumber">Vergi Numarası</Label>
                <Input
                  id="taxNumber"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="12345678"
                />
              </div>

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
