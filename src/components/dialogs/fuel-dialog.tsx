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
import { pushData, updateData, subscribeToData, updateData as updateVehicleKm } from '@/services/firebase';

interface Vehicle {
  id: string;
  plate: string;
  km?: number;
}

interface FuelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fuelRecord?: any;
  onSave?: () => void;
}

export function FuelDialog({ open, onOpenChange, fuelRecord, onSave }: FuelDialogProps) {
  const isEditMode = !!fuelRecord;

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [km, setKm] = useState('');
  const [station, setStation] = useState('');
  const [fuelType, setFuelType] = useState('diesel');
  const [paymentMethod, setPaymentMethod] = useState('cash');
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
      if (fuelRecord) {
        // Edit mode
        setVehicleId(fuelRecord.vehicleId || '');
        setDate(fuelRecord.date || today);
        setLiters(String(fuelRecord.liters || ''));
        setPricePerLiter(String(fuelRecord.pricePerLiter || ''));
        setTotalAmount(String(fuelRecord.totalAmount || ''));
        setKm(String(fuelRecord.km || ''));
        setStation(fuelRecord.station || '');
        setFuelType(fuelRecord.fuelType || 'diesel');
        setPaymentMethod(fuelRecord.paymentMethod || 'cash');
        setNotes(fuelRecord.notes || '');
      } else {
        // New fuel record
        setVehicleId('');
        setDate(today);
        setLiters('');
        setPricePerLiter('');
        setTotalAmount('');
        setKm('');
        setStation('');
        setFuelType('diesel');
        setPaymentMethod('cash');
        setNotes('');
      }
    }
  }, [open, fuelRecord]);

  // Auto-fill vehicle km when selected
  useEffect(() => {
    if (vehicleId && !isEditMode) {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle?.km) {
        setKm(String(vehicle.km));
      }
    }
  }, [vehicleId, vehicles, isEditMode]);

  // Calculate total when liters or price changes
  useEffect(() => {
    const l = parseFloat(liters) || 0;
    const p = parseFloat(pricePerLiter) || 0;
    if (l > 0 && p > 0) {
      setTotalAmount((l * p).toFixed(2));
    }
  }, [liters, pricePerLiter]);

  const handleSave = async () => {
    // Validation
    if (!vehicleId) {
      alert('Lutfen arac secin!');
      return;
    }
    if (!liters || parseFloat(liters) <= 0) {
      alert('Lutfen gecerli litre miktari girin!');
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      alert('Lutfen gecerli tutar girin!');
      return;
    }

    setSaving(true);
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);

      const fuelData: Record<string, any> = {
        vehicleId,
        vehiclePlate: vehicle?.plate || '',
        date,
        liters: parseFloat(liters) || 0,
        pricePerLiter: parseFloat(pricePerLiter) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        km: parseInt(km) || 0,
        station: station.trim(),
        fuelType,
        paymentMethod,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && fuelRecord?.id) {
        await updateData(`vehicle_fuel/${fuelRecord.id}`, fuelData);
      } else {
        fuelData.createdAt = new Date().toISOString();
        await pushData('vehicle_fuel', fuelData);

        // Update vehicle km if new km is higher
        if (vehicle && parseInt(km) > (vehicle.km || 0)) {
          await updateVehicleKm(`vehicles/${vehicleId}`, { km: parseInt(km) });
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? 'Yakit Kaydi Duzenle' : 'Yakit Ekle'}
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liters">Litre *</Label>
              <Input
                id="liters"
                type="number"
                step="0.01"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerLiter">Birim Fiyat</Label>
              <Input
                id="pricePerLiter"
                type="number"
                step="0.001"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
                placeholder="0.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Toplam *</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="station">Istasyon</Label>
              <Input
                id="station"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="Orn: Petrol Ofisi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelType">Yakit Tipi</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger>
                  <SelectValue placeholder="Yakit tipi secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Dizel</SelectItem>
                  <SelectItem value="gasoline">Benzin</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                  <SelectItem value="electric">Elektrik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Odeme</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Odeme yontemi secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit</SelectItem>
                  <SelectItem value="card">Kart</SelectItem>
                  <SelectItem value="company_card">Firma Karti</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
