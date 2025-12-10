'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { updateData } from '@/services/firebase';
import {
  Package, Truck, User, Building2, FileText, Loader2, Eraser, PenTool,
  CheckCircle, AlertTriangle
} from 'lucide-react';

// =================== INTERFACES ===================

interface WaybillItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
}

interface Waybill {
  id: string;
  waybillNumber?: string;
  relatedTransferId?: string;
  sourceLocation?: { branchName?: string; id?: string };
  targetLocation?: { branchName?: string; id?: string };
  driverName?: string;
  vehicle?: string;
  items?: WaybillItem[];
  status?: string;
  createdAt?: string;
}

// =================== SIGNATURE PAD COMPONENT ===================

interface SignaturePadProps {
  onClear?: () => void;
}

function SignaturePad({ onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasSignature(true);
  }, [getCoordinates]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [isDrawing, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  }, [onClear]);

  const getSignatureBase64 = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;

    return canvas.toDataURL('image/png');
  }, [hasSignature]);

  // Expose methods via ref
  useEffect(() => {
    (window as any).__signaturePad = {
      clear: clearSignature,
      getBase64: getSignatureBase64,
      hasSignature: () => hasSignature,
    };
  }, [clearSignature, getSignatureBase64, hasSignature]);

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed rounded-lg bg-white relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full h-[150px] cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
            <PenTool className="h-6 w-6 mr-2" />
            <span>Imza icin buraya cizin</span>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={clearSignature}
        className="w-full"
      >
        <Eraser className="h-4 w-4 mr-2" />
        Imzayi Temizle
      </Button>
    </div>
  );
}

// =================== WAYBILL RECEIVE DIALOG ===================

interface WaybillReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waybill: Waybill | null;
  onSuccess?: () => void;
}

export function WaybillReceiveDialog({ open, onOpenChange, waybill, onSuccess }: WaybillReceiveDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Received quantities for each item
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

  // Initialize received quantities when waybill changes
  useEffect(() => {
    if (open && waybill?.items) {
      const initial: Record<string, number> = {};
      waybill.items.forEach((item, index) => {
        initial[`${item.productId || index}`] = item.quantity || 0;
      });
      setReceivedQuantities(initial);
      setDeliveryNotes('');
    }
  }, [open, waybill]);

  if (!waybill) return null;

  const handleQuantityChange = (itemKey: string, value: number) => {
    setReceivedQuantities(prev => ({
      ...prev,
      [itemKey]: value,
    }));
  };

  const getDifference = (itemKey: string, expectedQty: number): number => {
    const received = receivedQuantities[itemKey] || 0;
    return received - expectedQty;
  };

  const hasDiscrepancy = (): boolean => {
    return waybill.items?.some((item, index) => {
      const key = `${item.productId || index}`;
      return getDifference(key, item.quantity || 0) !== 0;
    }) || false;
  };

  const handleConfirmDelivery = async () => {
    // Check signature
    const signaturePad = (window as any).__signaturePad;
    if (!signaturePad?.hasSignature()) {
      alert('Lutfen teslim almadan once imza atiniz');
      return;
    }

    // Check for discrepancy
    if (hasDiscrepancy()) {
      const confirmed = confirm(
        'Teslim alinan miktarlarda fark var. Yine de devam etmek istiyor musunuz?'
      );
      if (!confirmed) return;
    }

    setSaving(true);

    try {
      const signatureBase64 = signaturePad.getBase64();
      const timestamp = new Date().toISOString();

      // Build received items data
      const receivedItems = waybill.items?.map((item, index) => {
        const key = `${item.productId || index}`;
        return {
          productId: item.productId,
          productName: item.productName,
          expectedQuantity: item.quantity || 0,
          receivedQuantity: receivedQuantities[key] || 0,
          difference: getDifference(key, item.quantity || 0),
          unit: item.unit,
        };
      }) || [];

      // Update waybill status
      await updateData(`internal_waybills/${waybill.id}`, {
        status: 'delivered',
        deliveredAt: timestamp,
        deliveredBy: 'admin',
        deliveredByName: 'Admin',
        signatureData: signatureBase64,
        deliveryNotes,
        receivedItems,
        hasDiscrepancy: hasDiscrepancy(),
      });

      // Update related transfer if exists
      if (waybill.relatedTransferId) {
        await updateData(`stock_transfers/${waybill.relatedTransferId}`, {
          status: 'completed',
          completedAt: timestamp,
        });
      }

      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('Delivery error:', error);
      alert('Teslim alma hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Irsaliye Teslim Al
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Waybill Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Irsaliye No</Label>
              <p className="font-mono font-medium">{waybill.waybillNumber || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Kaynak Sube</Label>
              <p className="flex items-center gap-1 text-sm">
                <Building2 className="h-4 w-4 text-gray-400" />
                {waybill.sourceLocation?.branchName || '-'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Hedef Sube</Label>
              <p className="flex items-center gap-1 text-sm">
                <Building2 className="h-4 w-4 text-gray-400" />
                {waybill.targetLocation?.branchName || '-'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Surucu</Label>
              <p className="flex items-center gap-1 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                {waybill.driverName || '-'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Arac</Label>
              <p className="flex items-center gap-1 text-sm">
                <Truck className="h-4 w-4 text-gray-400" />
                {waybill.vehicle || '-'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <Label className="mb-2 block">Teslim Alinacak Urunler</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urun Adi</TableHead>
                    <TableHead className="text-right w-[100px]">Beklenen</TableHead>
                    <TableHead className="text-right w-[120px]">Teslim Alinan</TableHead>
                    <TableHead className="w-[60px]">Birim</TableHead>
                    <TableHead className="text-right w-[80px]">Fark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waybill.items && waybill.items.length > 0 ? (
                    waybill.items.map((item, index) => {
                      const key = `${item.productId || index}`;
                      const expectedQty = item.quantity || 0;
                      const diff = getDifference(key, expectedQty);

                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{item.productName || '-'}</TableCell>
                          <TableCell className="text-right">{expectedQty}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={receivedQuantities[key] || 0}
                              onChange={(e) => handleQuantityChange(key, Number(e.target.value))}
                              className="w-24 h-8 text-right"
                              min={0}
                            />
                          </TableCell>
                          <TableCell>{item.unit || 'Adet'}</TableCell>
                          <TableCell className={`text-right font-medium ${
                            diff === 0 ? 'text-gray-900' :
                            diff > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {diff === 0 ? '0' : diff > 0 ? `+${diff}` : diff}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                        Urun bulunmuyor
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {hasDiscrepancy() && (
              <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Miktarlarda farklilik tespit edildi</span>
              </div>
            )}
          </div>

          {/* Signature */}
          <div>
            <Label className="mb-2 block flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Dijital Imza *
            </Label>
            <SignaturePad />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="deliveryNotes">Teslimat Notlari</Label>
            <Textarea
              id="deliveryNotes"
              placeholder="Opsiyonel notlar..."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Iptal
            </Button>
            <Button
              onClick={handleConfirmDelivery}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Teslim Al
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
