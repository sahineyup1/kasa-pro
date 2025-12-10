'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Truck, Package, Calendar, User, FileText, Loader2, Euro, Building2, Car
} from 'lucide-react';
import type { IncomingItem } from '@/app/dashboard/logistics/page';

// =================== INTERFACES ===================

interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  totalCost: number;
  targetBranch: string;
  sourceType: string;
}

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: { roleId?: string };
}

interface Branch {
  id: string;
  name?: string;
}

interface Product {
  id: string;
  costPrice?: number;
  purchasePrice?: number;
  pricing?: { costPrice?: number; purchasePrice?: number };
}

// =================== BULK TRANSFER DIALOG ===================

interface BulkTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: IncomingItem[];
  onSuccess?: () => void;
}

export function BulkTransferDialog({ open, onOpenChange, selectedItems, onSuccess }: BulkTransferDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [driverId, setDriverId] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');

  // Transfer items with editable quantities and costs
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  // Load data
  useEffect(() => {
    if (!open) return;

    setLoading(true);

    const unsubEmployees = subscribeToRTDB('employees', (data) => {
      // Filter drivers
      const drivers = (data || []).filter((e: Employee) => {
        const roleId = e.role?.roleId?.toLowerCase() || '';
        return roleId.includes('driver') || roleId.includes('sofor');
      });
      setEmployees(drivers);
    });

    const unsubBranches = subscribeToRTDB('branches', (data) => {
      setBranches(data || []);
    });

    const unsubProducts = subscribeToRTDB('products', (data) => {
      setProducts(data || []);
      setLoading(false);
    });

    return () => {
      unsubEmployees();
      unsubBranches();
      unsubProducts();
    };
  }, [open]);

  // Build transfer items from selected items
  useEffect(() => {
    if (!open || selectedItems.length === 0) return;

    const items: TransferItem[] = [];

    selectedItems.forEach(incoming => {
      incoming.items.forEach(item => {
        // Get cost price from products
        const product = products.find(p => p.id === item.productId);
        const costPrice = product?.costPrice ||
                         product?.purchasePrice ||
                         product?.pricing?.costPrice ||
                         product?.pricing?.purchasePrice || 0;

        const qty = item.quantity || 0;

        items.push({
          productId: item.productId || '',
          productName: item.productName || '-',
          quantity: qty,
          unit: item.unit || 'Adet',
          costPrice,
          totalCost: qty * costPrice,
          targetBranch: incoming.sourceId || incoming.source,
          sourceType: incoming.type === 'request' ? 'Talep' :
                     incoming.type === 'order' ? 'Siparis' : 'Eksik Liste',
        });
      });
    });

    setTransferItems(items);
  }, [open, selectedItems, products]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTransferDate(new Date().toISOString().split('T')[0]);
      setDriverId('');
      setVehiclePlate('');
      setNotes('');
      setTransferItems([]);
    }
  }, [open]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    return transferItems.reduce((sum, item) => sum + item.totalCost, 0);
  }, [transferItems]);

  // Update item quantity
  const handleQuantityChange = (index: number, newQty: number) => {
    const updated = [...transferItems];
    updated[index].quantity = newQty;
    updated[index].totalCost = newQty * updated[index].costPrice;
    setTransferItems(updated);
  };

  // Update item cost price
  const handleCostPriceChange = (index: number, newPrice: number) => {
    const updated = [...transferItems];
    updated[index].costPrice = newPrice;
    updated[index].totalCost = updated[index].quantity * newPrice;
    setTransferItems(updated);
  };

  // Get driver name
  const getDriverName = () => {
    const driver = employees.find(e => e.id === driverId);
    return driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : '';
  };

  // Get branch name
  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  };

  // Create transfers
  const handleCreateTransfer = async () => {
    // Validation
    if (!driverId) {
      alert('Lutfen surucu seciniz');
      return;
    }
    if (!vehiclePlate.trim()) {
      alert('Lutfen arac plakasi giriniz');
      return;
    }
    if (transferItems.length === 0) {
      alert('Transfer edilecek urun bulunmuyor');
      return;
    }

    setSaving(true);

    try {
      const now = new Date();
      const timestamp = now.toISOString();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      // Group items by target branch
      const itemsByBranch: Record<string, TransferItem[]> = {};
      transferItems.forEach(item => {
        if (!itemsByBranch[item.targetBranch]) {
          itemsByBranch[item.targetBranch] = [];
        }
        itemsByBranch[item.targetBranch].push(item);
      });

      const driverName = getDriverName();
      let createdCount = 0;

      // Create transfer for each branch
      for (const [branchId, items] of Object.entries(itemsByBranch)) {
        const transferNumber = `TRF-${dateStr}${timeStr}-${createdCount + 1}`;
        const waybillNumber = `IRS-${dateStr}${timeStr}-${createdCount + 1}`;

        // Calculate branch total
        const branchTotal = items.reduce((sum, i) => sum + i.totalCost, 0);

        // Create transfer
        const transferData = {
          transferNumber,
          transferDate,
          fromBranch: 'MERKEZ_DEPO',
          fromBranchName: 'Merkez Depo',
          toBranch: branchId,
          toBranchName: getBranchName(branchId),
          items: items.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unit: i.unit,
            costPrice: i.costPrice,
            totalCost: i.totalCost,
          })),
          totalCost: branchTotal,
          status: 'pending',
          createdAt: timestamp,
          createdBy: 'admin',
          createdByName: 'Admin',
          notes,
        };

        const transferId = await pushData('stock_transfers', transferData);

        // Create waybill
        const waybillData = {
          waybillNumber,
          relatedTransferId: transferId,
          sourceLocation: {
            id: 'MERKEZ_DEPO',
            branchName: 'Merkez Depo',
          },
          targetLocation: {
            id: branchId,
            branchName: getBranchName(branchId),
          },
          driverId,
          driverName,
          vehicle: vehiclePlate,
          items: items.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unit: i.unit,
          })),
          status: 'ready_to_dispatch',
          createdAt: timestamp,
          createdBy: 'admin',
        };

        await pushData('internal_waybills', waybillData);

        createdCount++;
      }

      // Update source items status
      for (const incoming of selectedItems) {
        const path = incoming.type === 'request' ? 'stock_requests' :
                     incoming.type === 'order' ? 'orders' : 'missing_lists';
        await updateData(`${path}/${incoming.id}`, {
          status: 'in_transfer',
          transferredAt: timestamp,
        });
      }

      alert(`${createdCount} transfer ve irsaliye basariyla olusturuldu!`);
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('Transfer error:', error);
      alert('Transfer olusturma hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Toplu Transfer + Irsaliye Olustur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transfer Info */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="flex items-center gap-1 mb-2">
                <Building2 className="h-4 w-4" />
                Kaynak
              </Label>
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                Merkez Depo
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1 mb-2">
                <Calendar className="h-4 w-4" />
                Transfer Tarihi
              </Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            <div>
              <Label className="flex items-center gap-1 mb-2">
                <User className="h-4 w-4" />
                Surucu *
              </Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Surucu sec..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.id).map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-1 mb-2">
                <Car className="h-4 w-4" />
                Arac Plakasi *
              </Label>
              <Input
                placeholder="Orn: SI-123-AB"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <Label className="mb-2 block">Transfer Edilecek Urunler ({transferItems.length})</Label>
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun Adi</TableHead>
                    <TableHead>Hedef Sube</TableHead>
                    <TableHead className="text-right w-[100px]">Miktar</TableHead>
                    <TableHead className="w-[60px]">Birim</TableHead>
                    <TableHead className="text-right w-[120px]">Maliyet (€)</TableHead>
                    <TableHead className="text-right w-[120px]">Toplam (€)</TableHead>
                    <TableHead className="w-[80px]">Kaynak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : transferItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Transfer edilecek urun yok
                      </TableCell>
                    </TableRow>
                  ) : (
                    transferItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{getBranchName(item.targetBranch)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                            className="w-20 h-8 text-right"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.costPrice}
                            onChange={(e) => handleCostPriceChange(index, Number(e.target.value))}
                            className="w-24 h-8 text-right"
                            min={0}
                            step={0.01}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          €{item.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{item.sourceType}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Total Cost */}
          <div className="flex items-center justify-end gap-2 text-lg font-semibold">
            <Euro className="h-5 w-5 text-green-600" />
            <span>Toplam Maliyet:</span>
            <span className="text-green-600">€{totalCost.toFixed(2)}</span>
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
            <Button onClick={handleCreateTransfer} disabled={saving || loading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transfer + Irsaliye Olustur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
