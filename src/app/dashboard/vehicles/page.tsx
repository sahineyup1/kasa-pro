'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Car,
  Fuel,
  Wrench,
  Shield,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { subscribeToData, removeData } from '@/services/firebase';
import { VehicleDialog } from '@/components/dialogs/vehicle-dialog';
import { FuelDialog } from '@/components/dialogs/fuel-dialog';
import { MaintenanceDialog } from '@/components/dialogs/maintenance-dialog';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  fuelType: string;
  km: number;
  insuranceExpiry?: string;
  kaskoExpiry?: string;
  inspectionExpiry?: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
}

interface FuelRecord {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  km: number;
  station: string;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  type: string;
  description: string;
  cost: number;
  km: number;
  vendor: string;
}

const vehicleTypeLabels: Record<string, string> = {
  car: 'Binek',
  truck: 'Kamyon',
  van: 'Van/Minibüs',
  motorcycle: 'Motosiklet',
};

const fuelTypeLabels: Record<string, string> = {
  gasoline: 'Benzin',
  diesel: 'Dizel',
  lpg: 'LPG',
  electric: 'Elektrik',
  hybrid: 'Hibrit',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700' },
  maintenance: { label: 'Bakımda', color: 'bg-yellow-100 text-yellow-700' },
  inactive: { label: 'Pasif', color: 'bg-gray-100 text-gray-700' },
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'vehicles' | 'fuel' | 'maintenance'>('vehicles');

  // Dialog states
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelRecord | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    let loadCount = 0;
    const checkLoaded = () => {
      loadCount++;
      if (loadCount >= 3) setLoading(false);
    };

    // Araçları dinle
    const unsubVehicles = subscribeToData('vehicles', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        setVehicles(list);
      } else {
        setVehicles([]);
      }
      checkLoaded();
    });

    // Yakıt kayıtlarını dinle
    const unsubFuel = subscribeToData('vehicle_fuel', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, f]: [string, any]) => ({ id, ...f }));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setFuelRecords(list);
      } else {
        setFuelRecords([]);
      }
      checkLoaded();
    });

    // Bakım kayıtlarını dinle
    const unsubMaintenance = subscribeToData('vehicle_maintenance', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, m]: [string, any]) => ({ id, ...m }));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMaintenanceRecords(list);
      } else {
        setMaintenanceRecords([]);
      }
      checkLoaded();
    });

    return () => {
      unsubVehicles();
      unsubFuel();
      unsubMaintenance();
    };
  }, []);

  const filteredVehicles = vehicles.filter((v) =>
    v.plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.plate || '-';
  };

  // Yaklaşan bitiş tarihleri kontrolü
  const getExpiryWarnings = () => {
    const warnings: { vehicle: Vehicle; type: string; date: string }[] = [];
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    vehicles.forEach((v) => {
      if (v.insuranceExpiry) {
        const expiry = new Date(v.insuranceExpiry);
        if (expiry.getTime() - now.getTime() < thirtyDays) {
          warnings.push({ vehicle: v, type: 'Sigorta', date: v.insuranceExpiry });
        }
      }
      if (v.kaskoExpiry) {
        const expiry = new Date(v.kaskoExpiry);
        if (expiry.getTime() - now.getTime() < thirtyDays) {
          warnings.push({ vehicle: v, type: 'Kasko', date: v.kaskoExpiry });
        }
      }
      if (v.inspectionExpiry) {
        const expiry = new Date(v.inspectionExpiry);
        if (expiry.getTime() - now.getTime() < thirtyDays) {
          warnings.push({ vehicle: v, type: 'Muayene', date: v.inspectionExpiry });
        }
      }
    });

    return warnings;
  };

  const expiryWarnings = getExpiryWarnings();

  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === 'active').length,
    totalFuel: fuelRecords.reduce((sum, f) => sum + (f.totalAmount || 0), 0),
    totalMaintenance: maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0),
  };

  // Handler functions
  const handleAddClick = () => {
    if (activeTab === 'vehicles') {
      setEditingVehicle(null);
      setVehicleDialogOpen(true);
    } else if (activeTab === 'fuel') {
      setEditingFuel(null);
      setFuelDialogOpen(true);
    } else {
      setEditingMaintenance(null);
      setMaintenanceDialogOpen(true);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleDialogOpen(true);
  };

  const handleEditFuel = (fuel: FuelRecord) => {
    setEditingFuel(fuel);
    setFuelDialogOpen(true);
  };

  const handleEditMaintenance = (m: MaintenanceRecord) => {
    setEditingMaintenance(m);
    setMaintenanceDialogOpen(true);
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (confirm(`"${vehicle.plate}" aracini silmek istediginize emin misiniz?`)) {
      try {
        await removeData(`vehicles/${vehicle.id}`);
      } catch (error) {
        alert('Silme hatasi: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteFuel = async (fuel: FuelRecord) => {
    if (confirm('Bu yakit kaydini silmek istediginize emin misiniz?')) {
      try {
        await removeData(`vehicle_fuel/${fuel.id}`);
      } catch (error) {
        alert('Silme hatasi: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteMaintenance = async (m: MaintenanceRecord) => {
    if (confirm('Bu bakim kaydini silmek istediginize emin misiniz?')) {
      try {
        await removeData(`vehicle_maintenance/${m.id}`);
      } catch (error) {
        alert('Silme hatasi: ' + (error as Error).message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Araçlar</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Araç, yakıt ve bakım yönetimi
          </p>
        </div>
        <Button size="sm" onClick={handleAddClick} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {activeTab === 'vehicles' && 'Yeni Arac'}
          {activeTab === 'fuel' && 'Yakit Ekle'}
          {activeTab === 'maintenance' && 'Bakim Ekle'}
        </Button>
      </div>

      {/* Expiry Warnings */}
      {expiryWarnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Yaklaşan Bitiş Tarihleri</h4>
                <ul className="mt-1 text-sm text-yellow-700">
                  {expiryWarnings.map((w, i) => (
                    <li key={i}>
                      {w.vehicle.plate} - {w.type}: {formatDate(w.date)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Araç
            </CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktif Araç
            </CardTitle>
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Yakıt
            </CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.totalFuel)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Bakım
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(stats.totalMaintenance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === 'vehicles' ? 'default' : 'outline'}
          onClick={() => setActiveTab('vehicles')}
          size="sm"
          className="flex-1 sm:flex-none"
        >
          <Car className="h-4 w-4 mr-2" />
          Araçlar
        </Button>
        <Button
          variant={activeTab === 'fuel' ? 'default' : 'outline'}
          onClick={() => setActiveTab('fuel')}
          size="sm"
          className="flex-1 sm:flex-none"
        >
          <Fuel className="h-4 w-4 mr-2" />
          Yakıt
        </Button>
        <Button
          variant={activeTab === 'maintenance' ? 'default' : 'outline'}
          onClick={() => setActiveTab('maintenance')}
          size="sm"
          className="flex-1 sm:flex-none"
        >
          <Wrench className="h-4 w-4 mr-2" />
          Bakım
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Plaka veya marka ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {activeTab === 'vehicles' && (
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Plaka</TableHead>
                  <TableHead>Marka/Model</TableHead>
                  <TableHead className="hidden md:table-cell">Yıl</TableHead>
                  <TableHead className="hidden sm:table-cell">Tip</TableHead>
                  <TableHead className="hidden lg:table-cell">Yakıt</TableHead>
                  <TableHead className="text-right hidden md:table-cell">KM</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-[100px]">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">Araç bulunamadı</h3>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.plate}</TableCell>
                      <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                      <TableCell className="hidden md:table-cell">{vehicle.year}</TableCell>
                      <TableCell className="hidden sm:table-cell">{vehicleTypeLabels[vehicle.type] || vehicle.type}</TableCell>
                      <TableCell className="hidden lg:table-cell">{fuelTypeLabels[vehicle.fuelType] || vehicle.fuelType}</TableCell>
                      <TableCell className="text-right font-mono hidden md:table-cell">
                        {vehicle.km?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusLabels[vehicle.status]?.color || 'bg-gray-100'}`}>
                          {statusLabels[vehicle.status]?.label || vehicle.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditVehicle(vehicle)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditVehicle(vehicle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteVehicle(vehicle)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'fuel' && (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Plaka</TableHead>
                  <TableHead className="text-right">Litre</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                  <TableHead className="text-right hidden md:table-cell">KM</TableHead>
                  <TableHead className="hidden lg:table-cell">Istasyon</TableHead>
                  <TableHead className="w-[100px]">Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">Yakit kaydi bulunamadi</h3>
                    </TableCell>
                  </TableRow>
                ) : (
                  fuelRecords.map((fuel) => (
                    <TableRow key={fuel.id}>
                      <TableCell>{formatDate(fuel.date)}</TableCell>
                      <TableCell className="font-medium">{getVehiclePlate(fuel.vehicleId)}</TableCell>
                      <TableCell className="text-right font-mono">{fuel.liters?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono hidden sm:table-cell">{formatCurrency(fuel.pricePerLiter || 0)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{formatCurrency(fuel.totalAmount || 0)}</TableCell>
                      <TableCell className="text-right font-mono hidden md:table-cell">{fuel.km?.toLocaleString()}</TableCell>
                      <TableCell className="hidden lg:table-cell">{fuel.station || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditFuel(fuel)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteFuel(fuel)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'maintenance' && (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Plaka</TableHead>
                  <TableHead className="hidden sm:table-cell">Tip</TableHead>
                  <TableHead className="hidden lg:table-cell">Aciklama</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="text-right hidden md:table-cell">KM</TableHead>
                  <TableHead className="hidden md:table-cell">Servis</TableHead>
                  <TableHead className="w-[100px]">Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">Bakim kaydi bulunamadi</h3>
                    </TableCell>
                  </TableRow>
                ) : (
                  maintenanceRecords.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell className="font-medium">{getVehiclePlate(m.vehicleId)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{m.type}</TableCell>
                      <TableCell className="max-w-[200px] truncate hidden lg:table-cell">{m.description || '-'}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{formatCurrency(m.cost || 0)}</TableCell>
                      <TableCell className="text-right font-mono hidden md:table-cell">{m.km?.toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell">{m.vendor || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditMaintenance(m)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteMaintenance(m)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        vehicle={editingVehicle}
      />
      <FuelDialog
        open={fuelDialogOpen}
        onOpenChange={setFuelDialogOpen}
        fuelRecord={editingFuel}
      />
      <MaintenanceDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        maintenanceRecord={editingMaintenance}
      />
    </div>
  );
}
