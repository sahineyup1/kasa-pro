'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { addFirestoreData, updateFirestoreData } from '@/services/firebase';
import { toast } from 'sonner';
import { Wallet, DoorOpen, DoorClosed, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';

// Shared interfaces
export interface CashRegister {
  id: string;
  date?: string;
  openingBalance?: number;
  closingBalance?: number;
  expectedBalance?: number;
  status?: 'open' | 'closed';
  openedBy?: string;
  closedBy?: string;
  openedAt?: string;
  closedAt?: string;
  notes?: string;
}

// Para birimleri - EUR
const DENOMINATIONS_EUR = [
  { value: 500, label: '500 EUR' },
  { value: 200, label: '200 EUR' },
  { value: 100, label: '100 EUR' },
  { value: 50, label: '50 EUR' },
  { value: 20, label: '20 EUR' },
  { value: 10, label: '10 EUR' },
  { value: 5, label: '5 EUR' },
  { value: 2, label: '2 EUR' },
  { value: 1, label: '1 EUR' },
  { value: 0.50, label: '50 Cent' },
  { value: 0.20, label: '20 Cent' },
  { value: 0.10, label: '10 Cent' },
  { value: 0.05, label: '5 Cent' },
  { value: 0.02, label: '2 Cent' },
  { value: 0.01, label: '1 Cent' },
];

// ==================== KASA ACILIS DIALOG ====================
interface CashOpenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashOpenDialog({ open, onOpenChange }: CashOpenDialogProps) {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setCounts({});
      setNotes('');
    }
  }, [open]);

  const totalAmount = Object.entries(counts).reduce((sum, [denom, count]) => {
    return sum + (parseFloat(denom) * (count || 0));
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      await addFirestoreData('cashRegisters', {
        date: new Date().toISOString().split('T')[0],
        openingBalance: totalAmount,
        expectedBalance: totalAmount,
        status: 'open',
        openedAt: new Date().toISOString(),
        openedBy: 'user', // TODO: Get from auth
        notes,
      });
      toast.success('Kasa acildi');
      onOpenChange(false);
    } catch (error) {
      toast.error('Kasa acilamadi: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-green-600" />
            Kasa Acilisi
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Para Sayimi
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {DENOMINATIONS_EUR.map((denom) => (
                <div key={denom.value} className="flex items-center gap-2">
                  <span className="text-sm w-16">{denom.label}</span>
                  <Input
                    type="number"
                    min="0"
                    className="w-20 h-8 text-center"
                    value={counts[denom.value] || ''}
                    onChange={(e) => setCounts({
                      ...counts,
                      [denom.value]: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500 w-20">
                    = {((counts[denom.value] || 0) * denom.value).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Toplam Acilis Bakiyesi:</span>
              <span className="text-2xl font-bold text-green-600">
                EUR {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notlar</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Acilis notlari (opsiyonel)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Iptal
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              <DoorOpen className="h-4 w-4 mr-2" />
              {loading ? 'Aciliyor...' : 'Kasayi Ac'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== KASA KAPANIS DIALOG ====================
interface CashCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRegister: CashRegister | null;
}

export function CashCloseDialog({ open, onOpenChange, currentRegister }: CashCloseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setCounts({});
      setNotes('');
    }
  }, [open]);

  const totalAmount = Object.entries(counts).reduce((sum, [denom, count]) => {
    return sum + (parseFloat(denom) * (count || 0));
  }, 0);

  const expectedBalance = currentRegister?.expectedBalance || currentRegister?.openingBalance || 0;
  const difference = totalAmount - expectedBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRegister?.id) {
      toast.error('Acik kasa bulunamadi');
      return;
    }

    if (difference !== 0) {
      const confirmClose = confirm(
        `Kasa farki: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} EUR\n\nDevam etmek istiyor musunuz?`
      );
      if (!confirmClose) return;
    }

    setLoading(true);
    try {
      await updateFirestoreData('cashRegisters', currentRegister.id, {
        closingBalance: totalAmount,
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedBy: 'user', // TODO: Get from auth
        notes: notes || currentRegister.notes,
      });
      toast.success('Kasa kapatildi');
      onOpenChange(false);
    } catch (error) {
      toast.error('Kasa kapatilamadi: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorClosed className="h-5 w-5 text-red-600" />
            Kasa Kapanisi
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentRegister && (
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Acilis Bakiyesi:</span>
                  <span className="ml-2 font-medium">
                    EUR {(currentRegister.openingBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Beklenen Bakiye:</span>
                  <span className="ml-2 font-medium">
                    EUR {expectedBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Acilis Zamani:</span>
                  <span className="ml-2 font-medium">
                    {currentRegister.openedAt ? new Date(currentRegister.openedAt).toLocaleString('tr-TR') : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Para Sayimi
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {DENOMINATIONS_EUR.map((denom) => (
                <div key={denom.value} className="flex items-center gap-2">
                  <span className="text-sm w-16">{denom.label}</span>
                  <Input
                    type="number"
                    min="0"
                    className="w-20 h-8 text-center"
                    value={counts[denom.value] || ''}
                    onChange={(e) => setCounts({
                      ...counts,
                      [denom.value]: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500 w-20">
                    = {((counts[denom.value] || 0) * denom.value).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span>Sayilan Tutar:</span>
                <span className="text-xl font-bold">
                  EUR {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fark:</span>
                <span className={`text-xl font-bold ${
                  difference === 0 ? 'text-green-600' :
                  difference > 0 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {difference > 0 ? '+' : ''}{difference.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} EUR
                  {difference === 0 && ' ✓'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notlar</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kapanis notlari (opsiyonel)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Iptal
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={loading}>
              <DoorClosed className="h-4 w-4 mr-2" />
              {loading ? 'Kapatiliyor...' : 'Kasayi Kapat'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== KASA ISLEMI DIALOG ====================
interface CashTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
}

export function CashTransactionDialog({
  open,
  onOpenChange,
  type
}: CashTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: type,
    amount: 0,
    description: '',
    category: '',
    paymentMethod: 'cash',
    reference: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      setFormData({
        type: type,
        amount: 0,
        description: '',
        category: '',
        paymentMethod: 'cash',
        reference: '',
        customerName: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Gecerli tutar girin');
      return;
    }

    setLoading(true);
    try {
      await addFirestoreData('transactions', {
        ...formData,
        accountType: 'cash',
        createdAt: new Date().toISOString(),
      });
      toast.success('Islem kaydedildi');
      onOpenChange(false);
    } catch (error) {
      toast.error('Islem kaydedilemedi: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const INCOME_CATEGORIES = [
    { value: 'sales', label: 'Satis' },
    { value: 'service', label: 'Hizmet' },
    { value: 'collection', label: 'Tahsilat' },
    { value: 'refund_received', label: 'Iade Alindi' },
    { value: 'other_income', label: 'Diger Giris' },
  ];

  const EXPENSE_CATEGORIES = [
    { value: 'purchase', label: 'Alis' },
    { value: 'payment', label: 'Odeme' },
    { value: 'refund_given', label: 'Iade Verildi' },
    { value: 'salary', label: 'Maas' },
    { value: 'rent', label: 'Kira' },
    { value: 'utilities', label: 'Faturalar' },
    { value: 'supplies', label: 'Malzeme' },
    { value: 'transport', label: 'Ulasim' },
    { value: 'other_expense', label: 'Diger Cikis' },
  ];

  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.type === 'income' ? (
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            )}
            {formData.type === 'income' ? 'Kasaya Giris' : 'Kasadan Cikis'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Islem Tipi</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as 'income' | 'expense', category: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Giris</SelectItem>
                  <SelectItem value="expense">Cikis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tutar *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori secin" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Odeme Yontemi</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit</SelectItem>
                  <SelectItem value="card">Kart</SelectItem>
                  <SelectItem value="check">Cek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tarih</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Musteri/Tedarikci</Label>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Isim (opsiyonel)"
            />
          </div>

          <div className="space-y-2">
            <Label>Aciklama</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Islem aciklamasi"
            />
          </div>

          <div className="space-y-2">
            <Label>Fis/Referans No</Label>
            <Input
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Fis numarasi (opsiyonel)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Iptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={formData.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {formData.type === 'income' ? (
                <><ArrowUpRight className="h-4 w-4 mr-2" /> {loading ? 'Kaydediliyor...' : 'Girisi Kaydet'}</>
              ) : (
                <><ArrowDownRight className="h-4 w-4 mr-2" /> {loading ? 'Kaydediliyor...' : 'Cikisi Kaydet'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
