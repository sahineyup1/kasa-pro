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
import { subscribeToRTDB, pushData, updateData } from '@/services/firebase';
import {
  Search, Plus, Trash2, Loader2, ShoppingCart, Package, Calendar,
  User, FileText, CheckCircle, Clock, CreditCard, Banknote, Building2,
  Smartphone, Monitor, Euro
} from 'lucide-react';

// =================== INTERFACES ===================

interface OrderItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  price?: number;
}

interface Order {
  id: string;
  orderNo?: string;
  branchId?: string;
  source?: string;
  status?: string;
  customerName?: string;
  customerId?: string;
  createdAt?: string;
  createdBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  invoicedAt?: string;
  invoiceId?: string;
  completedAt?: string;
  items?: OrderItem[];
  total?: number;
  notes?: string;
}

interface Product {
  id: string;
  basic?: { name?: string };
  name?: string;
  barcodes?: { mainBarcode?: string };
  barcode?: string;
  pricing?: { sellPrice?: number };
  price?: number;
}

interface Customer {
  id: string;
  name?: string;
  companyName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
}

// =================== STATUS BADGE ===================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-800',
    'approved': 'bg-blue-100 text-blue-800',
    'invoiced': 'bg-purple-100 text-purple-800',
    'shipped': 'bg-cyan-100 text-cyan-800',
    'completed': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    'pending': 'Bekliyor',
    'approved': 'Onaylandi',
    'invoiced': 'Faturalandi',
    'shipped': 'Sevk Edildi',
    'completed': 'Tamamlandi',
    'rejected': 'Reddedildi',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

// =================== VIEW ORDER DIALOG ===================

interface ViewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function ViewOrderDialog({ open, onOpenChange, order }: ViewOrderDialogProps) {
  if (!order) return null;

  const total = order.total || order.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Siparis Detayi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Siparis No</Label>
              <p className="font-mono font-medium">{order.orderNo || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Durum</Label>
              <div><StatusBadge status={order.status || 'pending'} /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Musteri</Label>
              <p className="font-medium">{order.customerName || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Kaynak</Label>
              <p className="flex items-center gap-1 text-sm">
                {order.source === 'mobile' ? (
                  <><Smartphone className="h-4 w-4 text-blue-500" /> Mobil</>
                ) : (
                  <><Monitor className="h-4 w-4 text-gray-500" /> Desktop</>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Siparis Tarihi</Label>
              <p className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                {order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Olusturan</Label>
              <p className="flex items-center gap-1 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                {order.createdBy || '-'}
              </p>
            </div>
            {order.approvedAt && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Onay Tarihi</Label>
                <p className="text-sm">{new Date(order.approvedAt).toLocaleString('tr-TR')}</p>
              </div>
            )}
            {order.invoiceId && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Fatura No</Label>
                <p className="font-mono text-sm">{order.invoiceId}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Urunler ({order.items?.length || 0})</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun Adi</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items && order.items.length > 0 ? (
                    <>
                      {order.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit || 'Adet'}</TableCell>
                          <TableCell className="text-right">€{(item.price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            €{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={4} className="text-right font-semibold">Toplam:</TableCell>
                        <TableCell className="text-right font-bold text-lg">€{total.toFixed(2)}</TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                        Urun bulunmuyor
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Notlar</Label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">{order.notes}</div>
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

// =================== NEW ORDER DIALOG ===================

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewOrderDialog({ open, onOpenChange, onSuccess }: NewOrderDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Adet');
  const [price, setPrice] = useState(0);

  // Load data
  useEffect(() => {
    if (!open) return;

    const unsubProducts = subscribeToRTDB('products', (data) => {
      setProducts(data || []);
    });

    const unsubCustomers = subscribeToRTDB('customers', (data) => {
      setCustomers(data || []);
    });

    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setItems([]);
      setNotes('');
      setCustomerName('');
      setSearchQuery('');
      setSelectedProduct(null);
      setQuantity(1);
      setUnit('Adet');
      setPrice(0);
    }
  }, [open]);

  // Filter products
  const filteredProducts = products.filter(p => {
    if (!searchQuery) return false;
    const name = p.basic?.name || p.name || '';
    const barcode = p.barcodes?.mainBarcode || p.barcode || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || barcode.includes(q);
  }).slice(0, 10);

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSearchQuery(p.basic?.name || p.name || '');
    setPrice(p.pricing?.sellPrice || p.price || 0);
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const productName = selectedProduct.basic?.name || selectedProduct.name || '';

    setItems([...items, {
      productId: selectedProduct.id,
      productName,
      quantity,
      unit,
      price,
    }]);

    // Reset
    setSearchQuery('');
    setSelectedProduct(null);
    setQuantity(1);
    setPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);

  const handleSave = async () => {
    if (items.length === 0) {
      alert('En az bir urun eklemelisiniz');
      return;
    }
    if (!customerName.trim()) {
      alert('Musteri adi giriniz');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const orderNo = `SIP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      await pushData('orders', {
        orderNo,
        branchId: 'default',
        source: 'desktop',
        status: 'pending',
        customerName,
        items,
        total,
        notes,
        createdAt: now.toISOString(),
        createdBy: 'admin',
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Yeni Siparis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer */}
          <div>
            <Label htmlFor="customer">Musteri *</Label>
            <Input
              id="customer"
              placeholder="Musteri adi..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              list="customers-list"
            />
            <datalist id="customers-list">
              {customers.map(c => (
                <option key={c.id} value={c.name || c.companyName || ''} />
              ))}
            </datalist>
          </div>

          {/* Product Search */}
          <div className="space-y-3">
            <Label>Urun Ekle</Label>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Urun ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedProduct(null);
                  }}
                  className="pl-10"
                />
                {filteredProducts.length > 0 && !selectedProduct && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{p.basic?.name || p.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          €{(p.pricing?.sellPrice || p.price || 0).toFixed(2)}
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
                className="w-20"
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
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Euro className="h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="Fiyat"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-24"
                  min={0}
                  step={0.01}
                />
              </div>
              <Button onClick={handleAddItem} disabled={!selectedProduct}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <Label className="mb-2 block">Siparis Kalemleri ({items.length})</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        Henuz urun eklenmedi
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">€{(item.price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            €{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={4} className="text-right font-semibold">Toplam:</TableCell>
                        <TableCell className="text-right font-bold text-lg">€{total.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
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
              rows={2}
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

// =================== CONVERT TO INVOICE DIALOG ===================

interface ConvertToInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess?: () => void;
}

export function ConvertToInvoiceDialog({ open, onOpenChange, order, onSuccess }: ConvertToInvoiceDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && order) {
      setCustomerName(order.customerName || '');
      setNotes(order.notes || '');
    }
  }, [open, order]);

  if (!order) return null;

  const subtotal = order.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0) || 0;
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const invoiceNo = `FTR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      // Create invoice
      await pushData('sale_invoices', {
        invoiceNo,
        orderId: order.id,
        orderNo: order.orderNo,
        customerName,
        taxId,
        address,
        paymentMethod,
        items: order.items,
        subtotal,
        discount,
        discountAmount,
        total,
        notes,
        branchId: order.branchId,
        createdAt: now.toISOString(),
        createdBy: 'admin',
      });

      // Update order status
      await updateData(`orders/${order.id}`, {
        status: 'invoiced',
        invoiceId: invoiceNo,
        invoicedAt: now.toISOString(),
        invoicedBy: 'admin',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Invoice error:', error);
      alert('Fatura olusturma hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Faturaya Cevir - {order.orderNo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceCustomer">Musteri Adi</Label>
              <Input
                id="invoiceCustomer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="taxId">Vergi No</Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Opsiyonel"
              />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Odeme Yontemi</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <span className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Nakit
                    </span>
                  </SelectItem>
                  <SelectItem value="credit_card">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Kredi Karti
                    </span>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Havale/EFT
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discount">Iskonto (%)</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Ara Toplam:</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Iskonto ({discount}%):</span>
                <span>-€{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Toplam:</span>
              <span>€{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="invoiceNotes">Fatura Notlari</Label>
            <Textarea
              id="invoiceNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Iptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Fatura Olustur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =================== EDIT ORDER DIALOG ===================

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess?: () => void;
}

export function EditOrderDialog({ open, onOpenChange, order, onSuccess }: EditOrderDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Adet');
  const [price, setPrice] = useState(0);

  // Load products
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeToRTDB('products', (data) => {
      setProducts(data || []);
    });

    return () => unsubscribe();
  }, [open]);

  // Load order data
  useEffect(() => {
    if (open && order) {
      setItems(order.items || []);
      setNotes(order.notes || '');
      setCustomerName(order.customerName || '');
    }
  }, [open, order]);

  if (!order) return null;

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return false;
    const name = p.basic?.name || p.name || '';
    const barcode = p.barcodes?.mainBarcode || p.barcode || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || barcode.includes(q);
  }).slice(0, 10);

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSearchQuery(p.basic?.name || p.name || '');
    setPrice(p.pricing?.sellPrice || p.price || 0);
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const productName = selectedProduct.basic?.name || selectedProduct.name || '';

    setItems([...items, {
      productId: selectedProduct.id,
      productName,
      quantity,
      unit,
      price,
    }]);

    setSearchQuery('');
    setSelectedProduct(null);
    setQuantity(1);
    setPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    const updated = [...items];
    updated[index].quantity = newQty;
    setItems(updated);
  };

  const total = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);

  const handleSave = async () => {
    if (items.length === 0) {
      alert('En az bir urun olmalidir');
      return;
    }

    setSaving(true);
    try {
      await updateData(`orders/${order.id}`, {
        customerName,
        items,
        total,
        notes,
        updatedAt: new Date().toISOString(),
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Update error:', error);
      alert('Guncelleme hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Siparis Duzenle - {order.orderNo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer */}
          <div>
            <Label htmlFor="editCustomer">Musteri</Label>
            <Input
              id="editCustomer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Add Product */}
          <div className="space-y-3">
            <Label>Urun Ekle</Label>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Urun ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedProduct(null);
                  }}
                  className="pl-10"
                />
                {filteredProducts.length > 0 && !selectedProduct && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{p.basic?.name || p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-20"
                min={1}
              />
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-24"
                min={0}
                step={0.01}
              />
              <Button onClick={handleAddItem} disabled={!selectedProduct}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items */}
          <div>
            <Label className="mb-2 block">Siparis Kalemleri</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun</TableHead>
                    <TableHead className="text-right w-24">Miktar</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(index, Number(e.target.value))}
                          className="w-20 h-8 text-right"
                          min={1}
                        />
                      </TableCell>
                      <TableCell className="text-right">€{(item.price || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        €{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={3} className="text-right font-semibold">Toplam:</TableCell>
                    <TableCell className="text-right font-bold text-lg">€{total.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="editNotes">Notlar</Label>
            <Textarea
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Iptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
