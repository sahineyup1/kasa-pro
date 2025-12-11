'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useState, useEffect } from 'react';
import { addFirestoreData, updateFirestoreData } from '@/services/firebase';
import { toast } from 'sonner';
import { Receipt, Save, X, Loader2, Store } from 'lucide-react';

// Sabit Şube Listesi
const BRANCHES = [
  { id: 'merkez', name: 'Merkez Depo', icon: '🏭' },
  { id: 'balkan', name: 'Balkan Market', icon: '🛒' },
  { id: 'desetka', name: 'Desetka Market', icon: '🛒' },
  { id: 'mesnica', name: 'Mesnica Kasap', icon: '🥩' },
];

interface SaleInvoice {
  id?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  customerName?: string;
  customerId?: string;
  branchId?: string;
  branchName?: string;
  items?: any[];
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  paymentMethod?: string;
  status?: string;
  notes?: string;
}

interface SaleInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: SaleInvoice | null;
  branches?: { id: string; name?: string }[];
  onSave?: () => void;
}

export function SaleInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  branches = [],
  onSave,
}: SaleInvoiceDialogProps) {
  const [formData, setFormData] = useState<SaleInvoice>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) {
      setFormData(invoice);
    } else {
      setFormData({
        invoiceDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        paymentMethod: 'cash',
      });
    }
  }, [invoice, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (invoice?.id) {
        await updateFirestoreData('saleInvoices', invoice.id, formData);
        toast.success('Fatura guncellendi');
      } else {
        const invoiceNo = `SF-${Date.now().toString().slice(-6)}`;
        await addFirestoreData('saleInvoices', {
          ...formData,
          invoiceNumber: invoiceNo,
        });
        toast.success('Yeni fatura olusturuldu');
      }
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Kayit sirasinda hata olustu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {invoice ? 'Fatura Duzenle' : 'Yeni Satis Faturasi'}
          </DialogTitle>
          <DialogDescription>
            Satis faturasi bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fatura Tarihi</Label>
              <Input
                type="date"
                value={formData.invoiceDate || ''}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Store className="h-4 w-4" />
                Sube *
              </Label>
              <Select
                value={formData.branchId || ''}
                onValueChange={(value) => {
                  const branch = BRANCHES.find(b => b.id === value);
                  setFormData({
                    ...formData,
                    branchId: value,
                    branchName: branch?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sube secin" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.icon} {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Musteri Adi</Label>
            <Input
              value={formData.customerName || ''}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Musteri adi"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Odeme Yontemi</Label>
              <Select
                value={formData.paymentMethod || 'cash'}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit</SelectItem>
                  <SelectItem value="card">Kredi Karti</SelectItem>
                  <SelectItem value="transfer">Havale/EFT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Select
                value={formData.status || 'pending'}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="paid">Odendi</SelectItem>
                  <SelectItem value="partial">Kismi</SelectItem>
                  <SelectItem value="cancelled">Iptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Toplam Tutar</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.total || ''}
              onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Notlar</Label>
            <Input
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Fatura notu (opsiyonel)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Iptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
