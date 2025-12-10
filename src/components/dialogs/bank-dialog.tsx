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
import { Building2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Edit, Trash2 } from 'lucide-react';

// Shared interfaces
export interface BankAccount {
  id: string;
  name?: string;
  bankName?: string;
  iban?: string;
  currency?: string;
  balance?: number;
  branch?: string;
  accountNumber?: string;
  swiftCode?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface BankTransaction {
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'eft' | 'havale';
  amount: number;
  description: string;
  reference?: string;
  targetAccountId?: string;
  date: string;
}

const BANKS = [
  'NLB d.d.',
  'Nova KBM',
  'SKB Banka',
  'Addiko Bank',
  'Unicredit Banka',
  'Sparkasse',
  'NKBM',
  'Delavska Hranilnica',
  'Ziraat Bankasi',
  'Is Bankasi',
  'Garanti BBVA',
  'Yapi Kredi',
  'Akbank',
  'Diger',
];

// ==================== BANKA HESABI DIALOG ====================
interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount | null;
}

export function BankAccountDialog({ open, onOpenChange, account }: BankAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bankName: '',
    iban: '',
    currency: 'EUR',
    balance: 0,
    branch: '',
    accountNumber: '',
    swiftCode: '',
    isActive: true,
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        bankName: account.bankName || '',
        iban: account.iban || '',
        currency: account.currency || 'EUR',
        balance: account.balance || 0,
        branch: account.branch || '',
        accountNumber: account.accountNumber || '',
        swiftCode: account.swiftCode || '',
        isActive: account.isActive !== false,
      });
    } else {
      setFormData({
        name: '',
        bankName: '',
        iban: '',
        currency: 'EUR',
        balance: 0,
        branch: '',
        accountNumber: '',
        swiftCode: '',
        isActive: true,
      });
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.bankName || !formData.iban) {
      toast.error('Lutfen zorunlu alanlari doldurun');
      return;
    }

    setLoading(true);
    try {
      if (account?.id) {
        await updateFirestoreData('bankAccounts', account.id, formData);
        toast.success('Banka hesabi guncellendi');
      } else {
        await addFirestoreData('bankAccounts', {
          ...formData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Banka hesabi eklendi');
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {account ? 'Banka Hesabi Duzenle' : 'Yeni Banka Hesabi'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hesap Adi *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ornek: Ana Hesap"
              />
            </div>
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
          </div>

          <div className="space-y-2">
            <Label>IBAN *</Label>
            <Input
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
              placeholder="SI56 0000 0000 0000 000"
              maxLength={32}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hesap No</Label>
              <Input
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="Hesap numarasi"
              />
            </div>
            <div className="space-y-2">
              <Label>Sube</Label>
              <Input
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                placeholder="Sube adi"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Acilis Bakiyesi</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>SWIFT Kodu</Label>
              <Input
                value={formData.swiftCode}
                onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value.toUpperCase() })}
                placeholder="XXXXXXXX"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Iptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : account ? 'Guncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== BANKA ISLEMI DIALOG ====================
interface BankTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BankAccount[];
  defaultType?: 'deposit' | 'withdrawal' | 'transfer' | 'eft' | 'havale';
}

export function BankTransactionDialog({
  open,
  onOpenChange,
  accounts,
  defaultType = 'deposit'
}: BankTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BankTransaction>({
    accountId: '',
    type: defaultType,
    amount: 0,
    description: '',
    reference: '',
    targetAccountId: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      setFormData({
        accountId: accounts[0]?.id || '',
        type: defaultType,
        amount: 0,
        description: '',
        reference: '',
        targetAccountId: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, defaultType, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId || !formData.amount || formData.amount <= 0) {
      toast.error('Lutfen hesap secin ve gecerli tutar girin');
      return;
    }
    if (['transfer', 'eft', 'havale'].includes(formData.type) && !formData.targetAccountId) {
      toast.error('Transfer islemleri icin hedef hesap secin');
      return;
    }

    setLoading(true);
    try {
      // Add transaction
      await addFirestoreData('transactions', {
        ...formData,
        accountType: 'bank',
        createdAt: new Date().toISOString(),
      });

      // Update account balance
      const account = accounts.find(a => a.id === formData.accountId);
      if (account) {
        const currentBalance = account.balance || 0;
        const newBalance = formData.type === 'deposit'
          ? currentBalance + formData.amount
          : currentBalance - formData.amount;

        await updateFirestoreData('bankAccounts', formData.accountId, {
          balance: newBalance
        });
      }

      // If internal transfer, update target account too
      if (formData.type === 'transfer' && formData.targetAccountId) {
        const targetAccount = accounts.find(a => a.id === formData.targetAccountId);
        if (targetAccount) {
          const targetBalance = targetAccount.balance || 0;
          await updateFirestoreData('bankAccounts', formData.targetAccountId, {
            balance: targetBalance + formData.amount
          });
        }
      }

      toast.success('Islem kaydedildi');
      onOpenChange(false);
    } catch (error) {
      toast.error('Islem basarisiz: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Para Yatirma',
      withdrawal: 'Para Cekme',
      transfer: 'Hesaplar Arasi Transfer',
      eft: 'EFT Gonderimi',
      havale: 'Havale Gonderimi',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'withdrawal': return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default: return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
    }
  };

  const isTransfer = ['transfer', 'eft', 'havale'].includes(formData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(formData.type)}
            {getTypeLabel(formData.type)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Islem Tipi</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v as BankTransaction['type'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Para Yatirma</SelectItem>
                <SelectItem value="withdrawal">Para Cekme</SelectItem>
                <SelectItem value="transfer">Hesaplar Arasi Transfer</SelectItem>
                <SelectItem value="eft">EFT Gonderimi</SelectItem>
                <SelectItem value="havale">Havale Gonderimi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isTransfer ? 'Kaynak Hesap *' : 'Hesap *'}</Label>
            <Select
              value={formData.accountId}
              onValueChange={(v) => setFormData({ ...formData, accountId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hesap secin" />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.id && a.isActive !== false).map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - {acc.bankName} ({acc.currency} {(acc.balance || 0).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTransfer && (
            <div className="space-y-2">
              <Label>Hedef Hesap / IBAN *</Label>
              {formData.type === 'transfer' ? (
                <Select
                  value={formData.targetAccountId}
                  onValueChange={(v) => setFormData({ ...formData, targetAccountId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hedef hesap secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.id && a.isActive !== false && a.id !== formData.accountId).map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} - {acc.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.targetAccountId || ''}
                  onChange={(e) => setFormData({ ...formData, targetAccountId: e.target.value.toUpperCase() })}
                  placeholder="Alici IBAN"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
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
            <Label>Referans No</Label>
            <Input
              value={formData.reference || ''}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Dekont/referans numarasi"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Iptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={
                formData.type === 'deposit' ? 'bg-green-600 hover:bg-green-700' :
                formData.type === 'withdrawal' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {loading ? 'Kaydediliyor...' : 'Islemi Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== BANKA HESAPLARI LISTESI DIALOG ====================
interface BankAccountsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BankAccount[];
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}

export function BankAccountsListDialog({
  open,
  onOpenChange,
  accounts,
  onEdit,
  onDelete
}: BankAccountsListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Banka Hesaplari
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henuz banka hesabi eklenmemis
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className={`p-4 border rounded-lg ${acc.isActive !== false ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{acc.name}</h4>
                      {acc.isActive === false && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Pasif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{acc.bankName} {acc.branch && `- ${acc.branch}`}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">{acc.iban}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {acc.currency} {(acc.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        onEdit(acc);
                        onOpenChange(false);
                      }}>
                        <Edit className="h-3 w-3 mr-1" /> Duzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => onDelete(acc)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Sil
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
