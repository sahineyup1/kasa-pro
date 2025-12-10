'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { pushData, updateData, subscribeToData } from '@/services/firebase';

// DDV Oranları (Slovenya)
const DDV_RATES = [
  { value: 22, label: '22% - Standart' },
  { value: 9.5, label: '9.5% - Indirimli' },
  { value: 5, label: '5% - Kitap' },
  { value: 0, label: '0% - Muaf' },
];

// Fatura Durumları
const STATUSES = [
  { value: 'draft', label: 'Taslak' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandi' },
  { value: 'cancelled', label: 'Iptal' },
];

// Odeme Durumları
const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Odenmedi' },
  { value: 'partial', label: 'Kismi Odeme' },
  { value: 'paid', label: 'Odendi' },
];

interface Supplier {
  id: string;
  name: string;
  taxNumber?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ddvRate: number;
  ddvAmount: number;
  total: number;
}

interface PurchaseInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: any;
  onSave?: () => void;
}

export function PurchaseInvoiceDialog({ open, onOpenChange, invoice, onSave }: PurchaseInvoiceDialogProps) {
  const isEditMode = !!invoice;

  // Form state
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierDdvNo, setSupplierDdvNo] = useState('');
  const [status, setStatus] = useState('pending');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Suppliers from Firebase
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Load suppliers
  useEffect(() => {
    const unsubscribe = subscribeToData('suppliers', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, s]: [string, any]) => ({
          id,
          name: s.name || s.companyName || '',
          taxNumber: s.taxNumber || s.ddvNumber || '',
        })).filter(s => s.name);
        list.sort((a, b) => a.name.localeCompare(b.name));
        setSuppliers(list);
      }
    });
    return () => unsubscribe();
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (invoice) {
        // Edit mode
        setInvoiceNo(invoice.invoiceNo || '');
        setInvoiceDate(invoice.date || today);
        setDueDate(invoice.dueDate || thirtyDaysLater);
        setSupplierId(invoice.supplierId || '');
        setSupplierDdvNo(invoice.supplierDdvNo || '');
        setStatus(invoice.status || 'pending');
        setPaymentStatus(invoice.paymentStatus || 'unpaid');
        setNotes(invoice.notes || '');
        setItems(invoice.items?.map((item: any, index: number) => ({
          id: item.id || `item-${index}`,
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          ddvRate: item.ddvRate || 22,
          ddvAmount: item.ddvAmount || 0,
          total: item.total || 0,
        })) || []);
      } else {
        // New invoice
        setInvoiceNo('');
        setInvoiceDate(today);
        setDueDate(thirtyDaysLater);
        setSupplierId('');
        setSupplierDdvNo('');
        setStatus('pending');
        setPaymentStatus('unpaid');
        setNotes('');
        setItems([createEmptyItem()]);
      }
    }
  }, [open, invoice]);

  // Auto-fill supplier DDV when selected
  useEffect(() => {
    if (supplierId) {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier?.taxNumber) {
        setSupplierDdvNo(supplier.taxNumber);
      }
    }
  }, [supplierId, suppliers]);

  const createEmptyItem = (): InvoiceItem => ({
    id: `item-${Date.now()}`,
    description: '',
    quantity: 1,
    unitPrice: 0,
    ddvRate: 22,
    ddvAmount: 0,
    total: 0,
  });

  const addItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Recalculate totals
      const subtotal = updated.quantity * updated.unitPrice;
      updated.ddvAmount = subtotal * (updated.ddvRate / 100);
      updated.total = subtotal + updated.ddvAmount;

      return updated;
    }));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const vatAmount = items.reduce((sum, item) => sum + item.ddvAmount, 0);
  const total = subtotal + vatAmount;

  const handleSave = async () => {
    // Validation
    if (!invoiceNo.trim()) {
      alert('Lutfen fatura numarasi girin!');
      return;
    }
    if (items.length === 0 || items.every(i => !i.description)) {
      alert('Lutfen en az bir kalem ekleyin!');
      return;
    }

    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);

      const invoiceData = {
        invoiceNo: invoiceNo.trim(),
        date: invoiceDate,
        dueDate: dueDate || null,
        supplierId: supplierId || null,
        supplier: supplier?.name || '',
        supplierDdvNo: supplierDdvNo.trim(),
        status,
        paymentStatus,
        items: items.filter(i => i.description).map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ddvRate: item.ddvRate,
          ddvAmount: item.ddvAmount,
          total: item.total,
        })),
        subtotal,
        vatAmount,
        total,
        notes: notes.trim(),
        currency: 'EUR',
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && invoice?.id) {
        await updateData(`purchase_invoices/${invoice.id}`, invoiceData);
      } else {
        invoiceData.createdAt = new Date().toISOString();
        await pushData('purchase_invoices', invoiceData);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? 'Alis Faturasi Duzenle' : 'Yeni Alis Faturasi'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Fatura Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Fatura Bilgileri
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNo">Fatura No *</Label>
                <Input
                  id="invoiceNo"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Orn: FAT-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Fatura Tarihi *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Vade Tarihi</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Durum</Label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Tedarikci Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Tedarikci Bilgileri
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Tedarikci</Label>
                <Select
                  id="supplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">- Tedarikci Secin -</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierDdvNo">Tedarikci DDV No</Label>
                <Input
                  id="supplierDdvNo"
                  value={supplierDdvNo}
                  onChange={(e) => setSupplierDdvNo(e.target.value)}
                  placeholder="SI12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Odeme Durumu</Label>
                <Select
                  id="paymentStatus"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  {PAYMENT_STATUSES.map((ps) => (
                    <option key={ps.value} value={ps.value}>{ps.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Kalemler */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Fatura Kalemleri
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Kalem Ekle
              </Button>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-4">Aciklama</div>
                <div className="col-span-1">Miktar</div>
                <div className="col-span-2">Birim Fiyat</div>
                <div className="col-span-2">DDV %</div>
                <div className="col-span-2 text-right">Toplam</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items */}
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Urun/hizmet aciklamasi"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <Select
                      value={String(item.ddvRate)}
                      onChange={(e) => updateItem(item.id, 'ddvRate', parseFloat(e.target.value))}
                    >
                      {DDV_RATES.map((rate) => (
                        <option key={rate.value} value={rate.value}>{rate.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2 text-right font-mono font-semibold">
                    {item.total.toFixed(2)} EUR
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-muted-foreground">Ara Toplam:</span>
                <span className="font-mono w-24 text-right">{subtotal.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-muted-foreground">DDV Toplam:</span>
                <span className="font-mono w-24 text-right">{vatAmount.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-end gap-8 text-lg font-semibold">
                <span>Genel Toplam:</span>
                <span className="font-mono w-24 text-right text-primary">{total.toFixed(2)} EUR</span>
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
              placeholder="Ek notlar, referanslar..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Iptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
