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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState, useEffect } from 'react';
import { pushData, subscribeToRTDB } from '@/services/firebase';
import { toast } from 'sonner';
import { ArrowRight, Plus, Trash2, Loader2, Truck, Package, Store } from 'lucide-react';

// Şube listesi
const BRANCHES = [
  { id: 'merkez', name: 'Merkez Depo', icon: '🏭', canSend: true, canReceive: true, canSendTo: ['balkan', 'desetka', 'mesnica'] },
  { id: 'balkan', name: 'Balkan Market', icon: '🛒', canSend: true, canReceive: true, canSendTo: ['mesnica'] }, // Sadece Mesnica'ya iade
  { id: 'desetka', name: 'Desetka Market', icon: '🛒', canSend: true, canReceive: true, canSendTo: ['mesnica'] }, // Sadece Mesnica'ya iade
  { id: 'mesnica', name: 'Mesnica Kasap', icon: '🥩', canSend: true, canReceive: true, canSendTo: ['merkez', 'balkan', 'desetka'] },
];

interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

interface Product {
  id: string;
  name?: string;
  productName?: string;
  unit?: string;
  birim?: string;
  category?: string;
  barcode?: string;
}

interface InternalTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InternalTransferDialog({
  open,
  onOpenChange,
  onSuccess,
}: InternalTransferDialogProps) {
  const [fromBranch, setFromBranch] = useState('');
  const [toBranch, setToBranch] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  // Yeni ürün ekleme için
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  // Ürünleri yükle
  useEffect(() => {
    const unsub = subscribeToRTDB('products', (data) => {
      setProducts(data || []);
    });
    return () => unsub();
  }, []);

  // Dialog açıldığında reset
  useEffect(() => {
    if (open) {
      setFromBranch('');
      setToBranch('');
      setItems([]);
      setNotes('');
      setTransferDate(new Date().toISOString().split('T')[0]);
      setNewProductId('');
      setNewQuantity('');
    }
  }, [open]);

  // Gönderilebilir şubeler
  const sendableBranches = BRANCHES.filter(b => b.canSend);

  // Alıcı şubeler (seçilen kaynağa göre)
  const receivableBranches = BRANCHES.filter(b => {
    if (!fromBranch) return false;
    const sender = BRANCHES.find(s => s.id === fromBranch);
    if (!sender) return false;
    return b.canReceive && b.id !== fromBranch && sender.canSendTo.includes(b.id);
  });

  // Ürün ekle
  const handleAddItem = () => {
    if (!newProductId || !newQuantity) {
      toast.error('Urun ve miktar secin');
      return;
    }

    const product = products.find(p => p.id === newProductId);
    if (!product) return;

    // Aynı ürün zaten varsa miktarı güncelle
    const existingIndex = items.findIndex(i => i.productId === newProductId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += parseFloat(newQuantity);
      setItems(updated);
    } else {
      setItems([...items, {
        productId: newProductId,
        productName: product.name || product.productName || '',
        quantity: parseFloat(newQuantity),
        unit: product.unit || product.birim || 'adet',
      }]);
    }

    setNewProductId('');
    setNewQuantity('');
  };

  // Ürün sil
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Transfer oluştur
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromBranch || !toBranch) {
      toast.error('Kaynak ve hedef sube secin');
      return;
    }

    if (items.length === 0) {
      toast.error('En az bir urun ekleyin');
      return;
    }

    setIsSubmitting(true);

    try {
      const fromBranchData = BRANCHES.find(b => b.id === fromBranch);
      const toBranchData = BRANCHES.find(b => b.id === toBranch);

      const transferNumber = `IT-${Date.now().toString().slice(-8)}`;

      // Transfer tipi: marketlerden mesnica'ya gidiyorsa "iade", diğerleri "sevkiyat"
      const isReturn = (fromBranch === 'balkan' || fromBranch === 'desetka') && toBranch === 'mesnica';

      await pushData('internal_transfers', {
        transferNumber,
        transferDate,
        transferType: isReturn ? 'iade' : 'sevkiyat',
        fromBranch,
        fromBranchName: fromBranchData?.name || fromBranch,
        toBranch,
        toBranchName: toBranchData?.name || toBranch,
        items,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
        status: 'pending',
        notes,
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
      });

      toast.success(`Transfer ${transferNumber} olusturuldu`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('Transfer olusturulamadi: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Ic Sevkiyat Olustur
          </DialogTitle>
          <DialogDescription>
            Subeler arasi urun transferi olusturun
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Şube Seçimi */}
          <div className="grid grid-cols-5 gap-4 items-center">
            <div className="col-span-2 space-y-2">
              <Label className="flex items-center gap-1">
                <Store className="h-4 w-4" />
                Kaynak Sube
              </Label>
              <Select value={fromBranch} onValueChange={setFromBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Gonderici sube" />
                </SelectTrigger>
                <SelectContent>
                  {sendableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.icon} {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-gray-400" />
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="flex items-center gap-1">
                <Store className="h-4 w-4" />
                Hedef Sube
              </Label>
              <Select value={toBranch} onValueChange={setToBranch} disabled={!fromBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Alici sube" />
                </SelectTrigger>
                <SelectContent>
                  {receivableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.icon} {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tarih */}
          <div className="space-y-2">
            <Label>Transfer Tarihi</Label>
            <Input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>

          {/* Ürün Ekleme */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <Label className="flex items-center gap-1 mb-3">
              <Package className="h-4 w-4" />
              Urun Ekle
            </Label>
            <div className="flex gap-2">
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Urun secin" />
                </SelectTrigger>
                <SelectContent>
                  {products.slice(0, 100).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name || product.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Miktar"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-24"
                min="0"
                step="0.01"
              />
              <Button type="button" onClick={handleAddItem} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Ürün Listesi */}
          {items.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 bg-gray-50 border-t text-sm text-gray-600">
                Toplam: {items.length} kalem, {items.reduce((sum, i) => sum + i.quantity, 0).toFixed(2)} birim
              </div>
            </div>
          )}

          {/* Notlar */}
          <div className="space-y-2">
            <Label>Notlar (opsiyonel)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transfer notu..."
            />
          </div>

          {/* Bilgilendirme */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-1">Ic Sevkiyat Kurallari:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Merkez Depo:</strong> Tum subelere gonderebilir</li>
              <li><strong>Mesnica Kasap:</strong> Diger marketlere et urunleri gonderebilir</li>
              <li><strong>Marketler:</strong> Bosa cikan etleri Mesnica'ya iade edebilir</li>
            </ul>
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Iptal
            </Button>
            <Button type="submit" disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              Transfer Olustur
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
