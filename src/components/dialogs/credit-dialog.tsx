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
import { Progress } from '@/components/ui/progress';
import { addFirestoreData, updateFirestoreData } from '@/services/firebase';
import { toast } from 'sonner';
import { CreditCard, Plus, DollarSign, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { BankAccount } from './bank-dialog';

// Shared interfaces
export interface Credit {
  id: string;
  bankName?: string;
  creditType?: string;
  amount?: number;
  interestRate?: number;
  term?: number;
  monthlyPayment?: number;
  startDate?: string;
  endDate?: string;
  paidAmount?: number;
  remainingAmount?: number;
  status?: 'active' | 'completed' | 'defaulted';
  accountNumber?: string;
  currency?: string;
  notes?: string;
  createdAt?: string;
}

export interface CreditPayment {
  id: string;
  creditId?: string;
  paymentNumber?: number;
  dueDate?: string;
  paidDate?: string;
  amount?: number;
  principal?: number;
  interest?: number;
  status?: 'pending' | 'paid' | 'late';
}

const CREDIT_TYPES = [
  { value: 'business', label: 'Ticari Kredi' },
  { value: 'personal', label: 'Ihtiyac Kredisi' },
  { value: 'mortgage', label: 'Konut Kredisi' },
  { value: 'vehicle', label: 'Tasit Kredisi' },
  { value: 'other', label: 'Diger' },
];

const BANKS = [
  'NLB d.d.',
  'Nova KBM',
  'SKB Banka',
  'Addiko Bank',
  'Unicredit Banka',
  'Sparkasse',
  'Ziraat Bankasi',
  'Is Bankasi',
  'Garanti BBVA',
  'Yapi Kredi',
  'Akbank',
  'Diger',
];

// ==================== KREDI EKLEME/DUZENLEME DIALOG ====================
interface CreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit?: Credit | null;
  bankAccounts: BankAccount[];
}

export function CreditDialog({ open, onOpenChange, credit, bankAccounts }: CreditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    creditType: 'business',
    amount: 0,
    interestRate: 0,
    term: 12,
    monthlyPayment: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    paidAmount: 0,
    remainingAmount: 0,
    accountNumber: '',
    currency: 'EUR',
    status: 'active' as 'active' | 'completed' | 'defaulted',
    notes: '',
  });

  useEffect(() => {
    if (credit) {
      setFormData({
        bankName: credit.bankName || '',
        creditType: credit.creditType || 'business',
        amount: credit.amount || 0,
        interestRate: credit.interestRate || 0,
        term: credit.term || 12,
        monthlyPayment: credit.monthlyPayment || 0,
        startDate: credit.startDate || new Date().toISOString().split('T')[0],
        endDate: credit.endDate || '',
        paidAmount: credit.paidAmount || 0,
        remainingAmount: credit.remainingAmount || 0,
        accountNumber: credit.accountNumber || '',
        currency: credit.currency || 'EUR',
        status: credit.status || 'active',
        notes: credit.notes || '',
      });
    } else {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 12);

      setFormData({
        bankName: '',
        creditType: 'business',
        amount: 0,
        interestRate: 0,
        term: 12,
        monthlyPayment: 0,
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        paidAmount: 0,
        remainingAmount: 0,
        accountNumber: '',
        currency: 'EUR',
        status: 'active',
        notes: '',
      });
    }
  }, [credit, open]);

  // Calculate monthly payment (PMT formula)
  useEffect(() => {
    if (formData.amount && formData.term && formData.interestRate) {
      const monthlyRate = formData.interestRate / 100 / 12;
      const n = formData.term;
      const p = formData.amount;

      const monthlyPayment = monthlyRate > 0
        ? p * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
        : p / n;

      setFormData(prev => ({
        ...prev,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        remainingAmount: credit ? prev.remainingAmount : p,
      }));
    }
  }, [formData.amount, formData.term, formData.interestRate, credit]);

  // Calculate end date
  useEffect(() => {
    if (formData.startDate && formData.term) {
      const start = new Date(formData.startDate);
      start.setMonth(start.getMonth() + formData.term);
      setFormData(prev => ({
        ...prev,
        endDate: start.toISOString().split('T')[0],
      }));
    }
  }, [formData.startDate, formData.term]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bankName || !formData.amount) {
      toast.error('Lutfen zorunlu alanlari doldurun');
      return;
    }

    setLoading(true);
    try {
      if (credit?.id) {
        await updateFirestoreData('credits', credit.id, formData);
        toast.success('Kredi guncellendi');
      } else {
        await addFirestoreData('credits', {
          ...formData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Kredi eklendi');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Islem basarisiz: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {credit ? 'Kredi Duzenle' : 'Yeni Kredi Ekle'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banka *</Label>
              <Select
                value={formData.bankName}
                onValueChange={(v) => setFormData({ ...formData, bankName: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Banka secin" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((bank) => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kredi Turu *</Label>
              <Select
                value={formData.creditType}
                onValueChange={(v) => setFormData({ ...formData, creditType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREDIT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Kredi Tutari *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Faiz Orani (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.interestRate || ''}
                onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Para Birimi</Label>
              <Select
                value={formData.currency}
                onValueChange={(v) => setFormData({ ...formData, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="TRY">TRY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vade (Ay)</Label>
              <Input
                type="number"
                min="1"
                value={formData.term || ''}
                onChange={(e) => setFormData({ ...formData, term: parseInt(e.target.value) || 12 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Aylik Taksit (Hesaplanan)</Label>
              <Input
                type="number"
                value={formData.monthlyPayment || ''}
                onChange={(e) => setFormData({ ...formData, monthlyPayment: parseFloat(e.target.value) || 0 })}
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Hesap No</Label>
              <Input
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="Kredi hesap no"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Baslangic Tarihi</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bitis Tarihi</Label>
              <Input
                type="date"
                value={formData.endDate}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          {credit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Odenen Tutar</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.paidAmount || ''}
                  onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kalan Borc</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.remainingAmount || ''}
                  onChange={(e) => setFormData({ ...formData, remainingAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Durum</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'completed' | 'defaulted' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="completed">Tamamlandi</SelectItem>
                <SelectItem value="defaulted">Temerrut</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notlar</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ek notlar (opsiyonel)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Iptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : credit ? 'Guncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== KREDI DETAY DIALOG ====================
interface CreditDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: Credit | null;
  payments: CreditPayment[];
}

export function CreditDetailDialog({ open, onOpenChange, credit, payments }: CreditDetailDialogProps) {
  if (!credit) return null;

  const progressPercent = ((credit.paidAmount || 0) / (credit.amount || 1)) * 100;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-amber-100 text-amber-800',
      defaulted: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      active: 'Aktif',
      completed: 'Tamamlandi',
      defaulted: 'Temerrut',
    };
    const icons: Record<string, React.ReactNode> = {
      active: <Clock className="h-3 w-3" />,
      completed: <CheckCircle2 className="h-3 w-3" />,
      defaulted: <AlertCircle className="h-3 w-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {icons[status]}
        {labels[status] || status}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {credit.bankName} - {CREDIT_TYPES.find(t => t.value === credit.creditType)?.label}
            </div>
            {getStatusBadge(credit.status || 'active')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Toplam Kredi</p>
              <p className="text-xl font-semibold">
                {credit.currency} {(credit.amount || 0).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Odenen</p>
              <p className="text-xl font-semibold text-green-600">
                {credit.currency} {(credit.paidAmount || 0).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Kalan Borc</p>
              <p className="text-xl font-semibold text-red-600">
                {credit.currency} {(credit.remainingAmount || 0).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Aylik Taksit</p>
              <p className="text-xl font-semibold text-amber-600">
                {credit.currency} {(credit.monthlyPayment || 0).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Odeme Ilerlemesi</span>
              <span className="text-sm font-medium">
                {progressPercent.toFixed(0)}% tamamlandi
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Kredi Bilgileri</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Banka:</span>
                  <span>{credit.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kredi Turu:</span>
                  <span>{CREDIT_TYPES.find(t => t.value === credit.creditType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Faiz Orani:</span>
                  <span>%{credit.interestRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vade:</span>
                  <span>{credit.term} ay</span>
                </div>
                {credit.accountNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hesap No:</span>
                    <span className="font-mono">{credit.accountNumber}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Tarihler</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Baslangic:</span>
                  <span>{credit.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bitis:</span>
                  <span>{credit.endDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payments */}
          <div>
            <h4 className="font-medium mb-3">Son Odemeler</h4>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Henuz odeme yapilmamis</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                {payments.slice(0, 10).map((payment) => (
                  <div key={payment.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Taksit #{payment.paymentNumber}</p>
                      <p className="text-sm text-gray-600">{payment.paidDate || payment.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{credit.currency} {(payment.amount || 0).toLocaleString('tr-TR')}</p>
                      <p className="text-xs text-gray-500">
                        Ana para: {(payment.principal || 0).toLocaleString('tr-TR')} | Faiz: {(payment.interest || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== KREDI ODEME DIALOG ====================
interface CreditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: Credit | null;
  bankAccounts: BankAccount[];
}

export function CreditPaymentDialog({ open, onOpenChange, credit, bankAccounts }: CreditPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: 0,
    paidDate: new Date().toISOString().split('T')[0],
    paymentNumber: 1,
    principal: 0,
    interest: 0,
    lateFee: 0,
    reference: '',
    notes: '',
    fromAccountId: '',
  });

  useEffect(() => {
    if (credit && open) {
      setFormData({
        amount: credit.monthlyPayment || 0,
        paidDate: new Date().toISOString().split('T')[0],
        paymentNumber: 1,
        principal: 0,
        interest: 0,
        lateFee: 0,
        reference: '',
        notes: '',
        fromAccountId: bankAccounts[0]?.id || '',
      });
    }
  }, [credit, open, bankAccounts]);

  // Calculate principal and interest split
  useEffect(() => {
    if (credit && formData.amount) {
      const monthlyRate = (credit.interestRate || 0) / 100 / 12;
      const interestPart = (credit.remainingAmount || 0) * monthlyRate;
      const principalPart = formData.amount - interestPart - formData.lateFee;

      setFormData(prev => ({
        ...prev,
        interest: Math.round(interestPart * 100) / 100,
        principal: Math.round(Math.max(0, principalPart) * 100) / 100,
      }));
    }
  }, [credit, formData.amount, formData.lateFee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credit?.id || !formData.amount || formData.amount <= 0) {
      toast.error('Gecerli tutar girin');
      return;
    }

    setLoading(true);
    try {
      // Add payment record
      await addFirestoreData('creditPayments', {
        creditId: credit.id,
        amount: formData.amount,
        paidDate: formData.paidDate,
        paymentNumber: formData.paymentNumber,
        principal: formData.principal,
        interest: formData.interest,
        status: 'paid',
        reference: formData.reference,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      });

      // Update credit totals
      const newPaidAmount = (credit.paidAmount || 0) + formData.amount;
      const newRemainingAmount = Math.max(0, (credit.remainingAmount || credit.amount || 0) - formData.principal);

      await updateFirestoreData('credits', credit.id, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newRemainingAmount <= 0 ? 'completed' : 'active',
      });

      // If paying from bank account, update balance
      if (formData.fromAccountId) {
        const account = bankAccounts.find(a => a.id === formData.fromAccountId);
        if (account) {
          await updateFirestoreData('bankAccounts', formData.fromAccountId, {
            balance: (account.balance || 0) - formData.amount
          });

          // Add transaction record
          await addFirestoreData('transactions', {
            accountId: formData.fromAccountId,
            accountType: 'bank',
            type: 'withdrawal',
            amount: formData.amount,
            description: `Kredi taksit odemesi - ${credit.bankName}`,
            date: formData.paidDate,
            reference: formData.reference,
            createdAt: new Date().toISOString(),
          });
        }
      }

      toast.success('Odeme kaydedildi');
      onOpenChange(false);
    } catch (error) {
      toast.error('Odeme kaydedilemedi: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!credit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Taksit Odemesi - {credit.bankName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Kalan Borc:</span>
                <span className="ml-2 font-medium">
                  {credit.currency} {(credit.remainingAmount || 0).toLocaleString('tr-TR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Aylik Taksit:</span>
                <span className="ml-2 font-medium">
                  {credit.currency} {(credit.monthlyPayment || 0).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taksit No</Label>
              <Input
                type="number"
                value={formData.paymentNumber}
                onChange={(e) => setFormData({ ...formData, paymentNumber: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Odeme Tarihi</Label>
              <Input
                type="date"
                value={formData.paidDate}
                onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Odeme Tutari *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Gecikme Bedeli</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.lateFee || ''}
                onChange={(e) => setFormData({ ...formData, lateFee: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Odeme Yapilacak Hesap</Label>
            <Select
              value={formData.fromAccountId}
              onValueChange={(v) => setFormData({ ...formData, fromAccountId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hesap secin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel odeme</SelectItem>
                {bankAccounts.filter(a => a.id && a.isActive !== false).map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - {acc.bankName} ({acc.currency} {(acc.balance || 0).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Odeme Dagilimi (Hesaplanan)</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ana Para:</span>
                <span>{credit.currency} {formData.principal.toLocaleString('tr-TR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Faiz:</span>
                <span>{credit.currency} {formData.interest.toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Referans/Dekont No</Label>
            <Input
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Odeme referansi"
            />
          </div>

          <div className="space-y-2">
            <Label>Notlar</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ek notlar (opsiyonel)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Iptal
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {loading ? 'Kaydediliyor...' : 'Odemeyi Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
