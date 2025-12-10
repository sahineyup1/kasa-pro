'use client';

import { useState, useEffect } from 'react';
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
import { pushData, updateData } from '@/services/firebase';

// Arac Tipleri
const VEHICLE_TYPES = [
  { value: 'car', label: 'Binek' },
  { value: 'truck', label: 'Kamyon' },
  { value: 'van', label: 'Van/Minibus' },
  { value: 'motorcycle', label: 'Motosiklet' },
];

// Yakit Tipleri
const FUEL_TYPES = [
  { value: 'gasoline', label: 'Benzin' },
  { value: 'diesel', label: 'Dizel' },
  { value: 'lpg', label: 'LPG' },
  { value: 'electric', label: 'Elektrik' },
  { value: 'hybrid', label: 'Hibrit' },
];

// Durum
const STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'maintenance', label: 'Bakimda' },
  { value: 'inactive', label: 'Pasif' },
];

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: any;
  onSave?: () => void;
}

export function VehicleDialog({ open, onOpenChange, vehicle, onSave }: VehicleDialogProps) {
  const isEditMode = !!vehicle;

  // Form state
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('car');
  const [fuelType, setFuelType] = useState('diesel');
  const [km, setKm] = useState('');
  const [status, setStatus] = useState('active');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [kaskoExpiry, setKaskoExpiry] = useState('');
  const [inspectionExpiry, setInspectionExpiry] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (vehicle) {
        // Edit mode
        setPlate(vehicle.plate || '');
        setBrand(vehicle.brand || '');
        setModel(vehicle.model || '');
        setYear(String(vehicle.year || ''));
        setType(vehicle.type || 'car');
        setFuelType(vehicle.fuelType || 'diesel');
        setKm(String(vehicle.km || ''));
        setStatus(vehicle.status || 'active');
        setInsuranceExpiry(vehicle.insuranceExpiry || '');
        setKaskoExpiry(vehicle.kaskoExpiry || '');
        setInspectionExpiry(vehicle.inspectionExpiry || '');
        setAssignedTo(vehicle.assignedTo || '');
        setNotes(vehicle.notes || '');
      } else {
        // New vehicle - reset
        setPlate('');
        setBrand('');
        setModel('');
        setYear(String(new Date().getFullYear()));
        setType('car');
        setFuelType('diesel');
        setKm('');
        setStatus('active');
        setInsuranceExpiry('');
        setKaskoExpiry('');
        setInspectionExpiry('');
        setAssignedTo('');
        setNotes('');
      }
    }
  }, [open, vehicle]);

  const handleSave = async () => {
    // Validation
    if (!plate.trim()) {
      alert('Lutfen plaka girin!');
      return;
    }
    if (!brand.trim()) {
      alert('Lutfen marka girin!');
      return;
    }

    setSaving(true);
    try {
      const vehicleData = {
        plate: plate.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year) || new Date().getFullYear(),
        type,
        fuelType,
        km: parseInt(km) || 0,
        status,
        insuranceExpiry: insuranceExpiry || null,
        kaskoExpiry: kaskoExpiry || null,
        inspectionExpiry: inspectionExpiry || null,
        assignedTo: assignedTo.trim() || null,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && vehicle?.id) {
        await updateData(`vehicles/${vehicle.id}`, vehicleData);
      } else {
        vehicleData.createdAt = new Date().toISOString();
        await pushData('vehicles', vehicleData);
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
            {isEditMode ? 'Arac Duzenle' : 'Yeni Arac'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Temel Bilgiler */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Arac Bilgileri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate">Plaka *</Label>
                <Input
                  id="plate"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="Orn: LJ-123-AB"
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
              <div className="space-y-2">
                <Label htmlFor="brand">Marka *</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Orn: Volkswagen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Orn: Passat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Yil</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="1990"
                  max={new Date().getFullYear() + 1}
                />
              </div>
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
                <Label htmlFor="type">Arac Tipi</Label>
                <Select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuelType">Yakit Tipi</Label>
                <Select
                  id="fuelType"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Bitis Tarihleri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Bitis Tarihleri
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiry">Sigorta Bitis</Label>
                <Input
                  id="insuranceExpiry"
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kaskoExpiry">Kasko Bitis</Label>
                <Input
                  id="kaskoExpiry"
                  type="date"
                  value={kaskoExpiry}
                  onChange={(e) => setKaskoExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectionExpiry">Muayene Bitis</Label>
                <Input
                  id="inspectionExpiry"
                  type="date"
                  value={inspectionExpiry}
                  onChange={(e) => setInspectionExpiry(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Diger */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Atanan Kisi</Label>
              <Input
                id="assignedTo"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Surucunun adi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ek notlar..."
                rows={2}
              />
            </div>
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
