'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { pushData, updateData, subscribeToData } from '@/services/firebase';

// Bakim Tipleri
const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Yag Degisimi' },
  { value: 'tire_change', label: 'Lastik Degisimi' },
  { value: 'brake', label: 'Fren Bakimi' },
  { value: 'filter', label: 'Filtre Degisimi' },
  { value: 'battery', label: 'Aku' },
  { value: 'timing_belt', label: 'Triger Kayisi' },
  { value: 'clutch', label: 'Debriyaj' },
  { value: 'suspension', label: 'Suspensiyon' },
  { value: 'air_conditioning', label: 'Klima' },
  { value: 'electrical', label: 'Elektrik' },
  { value: 'body_repair', label: 'Kaporta' },
  { value: 'paint', label: 'Boya' },
  { value: 'inspection', label: 'Muayene' },
  { value: 'other', label: 'Diger' },
];

interface Vehicle {
  id: string;
  plate: string;
  km?: number;
}

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceRecord?: any;
  onSave?: () => void;
}

export function MaintenanceDialog({ open, onOpenChange, maintenanceRecord, onSave }: MaintenanceDialogProps) {
  const isEditMode = !!maintenanceRecord;

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('oil_change');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [km, setKm] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [nextServiceKm, setNextServiceKm] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Vehicles from Firebase
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Load vehicles
  useEffect(() => {
    const unsubscribe = subscribeToData('vehicles', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          plate: v.plate || '',
          km: v.km || 0,
        }));
        list.sort((a, b) => a.plate.localeCompare(b.plate));
        setVehicles(list);
      }
    });
    return () => unsubscribe();
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      if (maintenanceRecord) {
        // Edit mode
        setVehicleId(maintenanceRecord.vehicleId || '');
        setDate(maintenanceRecord.date || today);
        setType(maintenanceRecord.type || 'oil_change');
        setDescription(maintenanceRecord.description || '');
        setCost(String(maintenanceRecord.cost || ''));
        setKm(String(maintenanceRecord.km || ''));
        setVendor(maintenanceRecord.vendor || '');
        setInvoiceNo(maintenanceRecord.invoiceNo || '');
        setNextServiceKm(String(maintenanceRecord.nextServiceKm || ''));
        setNextServiceDate(maintenanceRecord.nextServiceDate || '');
        setNotes(maintenanceRecord.notes || '');
      } else {
        // New maintenance record
        setVehicleId('');
        setDate(today);
        setType('oil_change');
        setDescription('');
        setCost('');
        setKm('');
        setVendor('');
        setInvoiceNo('');
        setNextServiceKm('');
        setNextServiceDate('');
        setNotes('');
      }
    }
  }, [open, maintenanceRecord]);

  // Auto-fill vehicle km when selected
  useEffect(() => {
    if (vehicleId && !isEditMode) {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle?.km) {
        setKm(String(vehicle.km));
      }
    }
  }, [vehicleId, vehicles, isEditMode]);

  const handleSave = async () => {
    // Validation
    if (!vehicleId) {
      alert('Lutfen arac secin!');
      return;
    }
    if (!description.trim()) {
      alert('Lutfen aciklama girin!');
      return;
    }
    if (!cost || parseFloat(cost) <= 0) {
      alert('Lutfen gecerli tutar girin!');
      return;
    }

    setSaving(true);
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      const typeLabel = MAINTENANCE_TYPES.find(t => t.value === type)?.label || type;

      const maintenanceData: Record<string, any> = {
        vehicleId,
        vehiclePlate: vehicle?.plate || '',
        date,
        type,
        typeLabel,
        description: description.trim(),
        cost: parseFloat(cost) || 0,
        km: parseInt(km) || 0,
        vendor: vendor.trim(),
        invoiceNo: invoiceNo.trim(),
        nextServiceKm: parseInt(nextServiceKm) || null,
        nextServiceDate: nextServiceDate || null,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && maintenanceRecord?.id) {
        await updateData(`vehicle_maintenance/${maintenanceRecord.id}`, maintenanceData);
      } else {
        maintenanceData.createdAt = new Date().toISOString();
        await pushData('vehicle_maintenance', maintenanceData);

        // Update vehicle km if new km is higher
        if (vehicle && parseInt(km) > (vehicle.km || 0)) {
          await updateData(`vehicles/${vehicleId}`, { km: parseInt(km) });
        }
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? 'Bakim Kaydi Duzenle' : 'Bakim Ekle'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Arac *</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Arac secin" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.id).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Tarih *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Bakim Tipi *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Bakim tipi secin" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Tutar *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Aciklama *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Yapilan islem aciklamasi..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="km">Kilometre</Label>
              <Input
                id="km"
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Servis/Ustahane</Label>
              <Input
                id="vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Servis adi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNo">Fatura No</Label>
              <Input
                id="invoiceNo"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Fatura numarasi"
              />
            </div>
          </div>

          {/* Sonraki Servis */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Sonraki Servis (Opsiyonel)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nextServiceKm">Sonraki Servis KM</Label>
                <Input
                  id="nextServiceKm"
                  type="number"
                  value={nextServiceKm}
                  onChange={(e) => setNextServiceKm(e.target.value)}
                  placeholder="Orn: 150000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextServiceDate">Sonraki Servis Tarihi</Label>
                <Input
                  id="nextServiceDate"
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek notlar, parcalar, garantiler..."
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
