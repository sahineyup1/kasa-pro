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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subscribeToRTDB, pushData, updateData, removeData } from '@/services/firebase';
import {
  Search, Plus, Trash2, Loader2, ClipboardList, Package, Calendar,
  User, FileText, CheckCircle, Clock, Send
} from 'lucide-react';

// =================== INTERFACES ===================

interface MissingListItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
}

interface MissingList {
  id: string;
  listNo?: string;
  branchId?: string;
  status?: string;
  items?: MissingListItem[];
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  sentAt?: string;
  sentBy?: string;
  completedAt?: string;
  completedBy?: string;
  transferId?: string;
  transferNumber?: string;
}

interface Product {
  id: string;
  basic?: { name?: string };
  name?: string;
  barcodes?: { mainBarcode?: string };
  barcode?: string;
}

// =================== STATUS BADGE ===================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-800',
    'sent': 'bg-amber-100 text-amber-800',
    'processing': 'bg-purple-100 text-purple-800',
    'completed': 'bg-green-100 text-green-800',
  };

  const labels: Record<string, string> = {
    'pending': 'Bekliyor',
    'sent': 'Gonderildi',
    'processing': 'Isleniyor',
    'completed': 'Tamamlandi',
  };

  const icons: Record<string, React.ReactNode> = {
    'pending': <Clock className="h-3 w-3 mr-1" />,
    'sent': <Send className="h-3 w-3 mr-1" />,
    'processing': <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
    'completed': <CheckCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {icons[status]}
      {labels[status] || status}
    </span>
  );
}

// =================== VIEW DIALOG ===================

interface ViewMissingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: MissingList | null;
}

export function ViewMissingListDialog({ open, onOpenChange, list }: ViewMissingListDialogProps) {
  if (!list) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Eksik Listesi Detayi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Liste No</Label>
              <p className="font-mono font-medium">{list.listNo || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Durum</Label>
              <div><StatusBadge status={list.status || 'pending'} /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Olusturma Tarihi</Label>
              <p className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                {list.createdAt ? new Date(list.createdAt).toLocaleString('tr-TR') : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Olusturan</Label>
              <p className="flex items-center gap-1 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                {list.createdBy || '-'}
              </p>
            </div>
            {list.sentAt && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Gonderim Tarihi</Label>
                <p className="text-sm">{new Date(list.sentAt).toLocaleString('tr-TR')}</p>
              </div>
            )}
            {list.completedAt && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Tamamlanma Tarihi</Label>
                <p className="text-sm">{new Date(list.completedAt).toLocaleString('tr-TR')}</p>
              </div>
            )}
            {list.transferNumber && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Transfer No</Label>
                <p className="font-mono text-sm">{list.transferNumber}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Urunler ({list.items?.length || 0})</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun Adi</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items && list.items.length > 0 ? (
                    list.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit || 'Adet'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                        Urun bulunmuyor
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          {list.notes && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Notlar</Label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">{list.notes}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =================== NEW/EDIT DIALOG ===================

interface NewMissingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewMissingListDialog({ open, onOpenChange, onSuccess }: NewMissingListDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<MissingListItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Adet');

  // Load products
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeToRTDB('products', (data) => {
      setProducts(data || []);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setItems([]);
      setNotes('');
      setSearchQuery('');
      setSelectedProduct(null);
      setQuantity(1);
      setUnit('Adet');
    }
  }, [open]);

  // Filter products by search
  const filteredProducts = products.filter(p => {
    if (!searchQuery) return false;
    const name = p.basic?.name || p.name || '';
    const barcode = p.barcodes?.mainBarcode || p.barcode || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || barcode.includes(q);
  }).slice(0, 10);

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const productName = selectedProduct.basic?.name || selectedProduct.name || '';

    // Check if already in list
    const existingIndex = items.findIndex(i => i.productId === selectedProduct.id);
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...items];
      updated[existingIndex].quantity = (updated[existingIndex].quantity || 0) + quantity;
      setItems(updated);
    } else {
      // Add new
      setItems([...items, {
        productId: selectedProduct.id,
        productName,
        quantity,
        unit,
      }]);
    }

    // Reset
    setSearchQuery('');
    setSelectedProduct(null);
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      alert('En az bir urun eklemelisiniz');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const listNo = `EKS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      await pushData('missing_lists', {
        listNo,
        branchId: 'default', // TODO: Get from user context
        status: 'pending',
        items,
        notes,
        createdAt: now.toISOString(),
        createdBy: 'admin', // TODO: Get from auth
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Save error:', error);
      alert('Kaydetme hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Yeni Eksik Listesi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Search */}
          <div className="space-y-3">
            <Label>Urun Ekle</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Urun adi veya barkod ile ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedProduct(null);
                  }}
                  className="pl-10"
                />
                {/* Search Results Dropdown */}
                {filteredProducts.length > 0 && !selectedProduct && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setSelectedProduct(p);
                          setSearchQuery(p.basic?.name || p.name || '');
                        }}
                      >
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{p.basic?.name || p.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {p.barcodes?.mainBarcode || p.barcode}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                type="number"
                placeholder="Miktar"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24"
                min={1}
              />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Adet">Adet</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Lt">Lt</SelectItem>
                  <SelectItem value="Paket">Paket</SelectItem>
                  <SelectItem value="Koli">Koli</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddItem} disabled={!selectedProduct}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <Label className="mb-2 block">Eklenen Urunler ({items.length})</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun Adi</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                        Henuz urun eklenmedi
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              placeholder="Opsiyonel notlar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Iptal
            </Button>
            <Button onClick={handleSave} disabled={saving || items.length === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
