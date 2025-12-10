'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { subscribeToRTDB, updateData, removeData } from '@/services/firebase';
import { SupplierDialog } from '@/components/dialogs/supplier-dialog';
import { BulkVIESValidationDialog } from '@/components/dialogs/bulk-vies-validation-dialog';
import { Plus, RefreshCw, MoreHorizontal, Pencil, Trash2, Eye, Search, Building2, Globe, Phone, Mail, Shield } from 'lucide-react';

// Status badge component
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Aktif' : 'Pasif'}
    </span>
  );
}

// Country flags
const COUNTRY_FLAGS: Record<string, string> = {
  'SI': '🇸🇮',
  'AT': '🇦🇹',
  'DE': '🇩🇪',
  'IT': '🇮🇹',
  'HR': '🇭🇷',
  'HU': '🇭🇺',
  'CZ': '🇨🇿',
  'PL': '🇵🇱',
  'FR': '🇫🇷',
  'NL': '🇳🇱',
  'BE': '🇧🇪',
};

interface Supplier {
  id: string;
  basic?: {
    name?: string;
    shortName?: string;
    country?: string;
    type?: string;
    isActive?: boolean;
    categories?: string[];
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
    };
    contactPerson?: {
      name?: string;
      phone?: string;
    };
  };
  payment?: {
    currentBalance?: number;
    paymentTermDays?: number;
    currency?: string;
  };
  tax?: {
    taxId?: string;
    reverseCharge?: boolean;
    vies_validated?: boolean;
  };
  // Flat structure support (Python ERP compatibility)
  name?: string;
  country?: string;
  isActive?: boolean;
  phone?: string;
  email?: string;
  taxId?: string;
  currentBalance?: number;
}

// Helper to get field from nested or flat structure
function getField<T>(supplier: Supplier, nestedPath: string[], flatKey: string, defaultVal: T): T {
  // Try nested first
  let value: any = supplier;
  for (const key of nestedPath) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = undefined;
      break;
    }
  }
  if (value !== undefined && value !== null) return value as T;

  // Try flat
  const flatValue = (supplier as any)[flatKey];
  if (flatValue !== undefined && flatValue !== null) return flatValue as T;

  return defaultVal;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [viesDialogOpen, setViesDialogOpen] = useState(false);

  // Load suppliers from RTDB (partners collection filtered by isSupplier)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToRTDB('partners', (data) => {
      // Sadece tedarikçileri filtrele (type.isSupplier veya basic.partnerTypes.isSupplier)
      const suppliers = (data || []).filter((p: any) => {
        const isSupplier = p.type?.isSupplier || p.basic?.partnerTypes?.isSupplier;
        const isDeleted = p.basic?.status === 'deleted';
        return isSupplier && !isDeleted;
      });
      setSuppliers(suppliers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      // Search filter
      const name = getField(supplier, ['basic', 'name'], 'name', '');
      const email = getField(supplier, ['contact', 'email'], 'email', '');
      const phone = getField(supplier, ['contact', 'phone'], 'phone', '');
      const taxId = getField(supplier, ['tax', 'taxId'], 'taxId', '');

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        name.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower) ||
        phone.toLowerCase().includes(searchLower) ||
        taxId.toLowerCase().includes(searchLower);

      // Status filter
      const isActive = getField(supplier, ['basic', 'isActive'], 'isActive', true);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      // Country filter
      const country = getField(supplier, ['basic', 'country'], 'country', '');
      const matchesCountry = countryFilter === 'all' || country === countryFilter;

      // Category filter
      const categories = getField<string[]>(supplier, ['basic', 'categories'], 'categories', []);
      const matchesCategory = categoryFilter === 'all' ||
        categories.some(c => c.toLowerCase() === categoryFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesCountry && matchesCategory;
    });
  }, [suppliers, searchQuery, statusFilter, countryFilter, categoryFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => getField(s, ['basic', 'isActive'], 'isActive', true)).length;
    const totalBalance = suppliers.reduce((sum, s) => {
      return sum + getField(s, ['payment', 'currentBalance'], 'currentBalance', 0);
    }, 0);
    return { total, active, totalBalance };
  }, [suppliers]);

  // Get unique countries from suppliers
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    suppliers.forEach(s => {
      const country = getField(s, ['basic', 'country'], 'country', '');
      if (country) countrySet.add(country);
    });
    return Array.from(countrySet).sort();
  }, [suppliers]);

  // Get unique categories from suppliers
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    suppliers.forEach(s => {
      const cats = getField<string[]>(s, ['basic', 'categories'], 'categories', []);
      cats.forEach(c => categorySet.add(c));
    });
    return Array.from(categorySet).sort();
  }, [suppliers]);

  const handleRefresh = () => {
    setLoading(true);
    // Firestore subscription will auto-update
    setTimeout(() => setLoading(false), 500);
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };

  const handleView = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      const currentStatus = getField(supplier, ['basic', 'isActive'], 'isActive', true);
      const newStatus = !currentStatus;

      // Update based on structure
      if (supplier.basic) {
        await updateData(`partners/${supplier.id}/basic`, {
          isActive: newStatus,
        });
      } else {
        await updateData(`partners/${supplier.id}`, {
          isActive: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Durum guncellenemedi: ' + (error as Error).message);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    const name = getField(supplier, ['basic', 'name'], 'name', 'Tedarikci');
    if (!confirm(`"${name}" tedarikciyi silmek istediginize emin misiniz?`)) return;

    try {
      await removeData(`partners/${supplier.id}`);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme hatasi: ' + (error as Error).message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tedarikciler</h1>
            <p className="text-sm text-gray-500 mt-1">
              {stats.total} tedarikci - {stats.active} aktif
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            <Button
              variant="outline"
              onClick={() => setViesDialogOpen(true)}
            >
              <Shield className="h-4 w-4 mr-2" />
              Toplu VIES Dogrulama
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Tedarikci
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-xl font-semibold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ulkeler</p>
                <p className="text-xl font-semibold text-gray-900">{countries.length}</p>
              </div>
            </div>
          </div>
          <div className={`${stats.totalBalance >= 0 ? 'bg-red-50' : 'bg-green-50'} rounded-lg p-4`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${stats.totalBalance >= 0 ? 'bg-red-100' : 'bg-green-100'} rounded-lg`}>
                <Building2 className={`h-5 w-5 ${stats.totalBalance >= 0 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Bakiye</p>
                <p className={`text-xl font-semibold ${stats.totalBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.totalBalance >= 0 ? '-' : '+'}€{Math.abs(stats.totalBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tedarikci ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum durumlar</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
            </SelectContent>
          </Select>

          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Ulke" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum ulkeler</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {COUNTRY_FLAGS[country] || ''} {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum kategoriler</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Kod</TableHead>
                <TableHead>Tedarikci</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Ulke</TableHead>
                <TableHead>Iletisim</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead className="text-right">Borc</TableHead>
                <TableHead className="text-right">Alacak</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                    Yukleniyor...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                    {searchQuery || statusFilter !== 'all' || countryFilter !== 'all' || categoryFilter !== 'all'
                      ? 'Filtrelere uygun tedarikci bulunamadi'
                      : 'Henuz tedarikci eklenmemis'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const taxId = getField(supplier, ['tax', 'taxId'], 'taxId', '-');
                  const name = getField(supplier, ['basic', 'name'], 'name', 'Bilinmiyor');
                  const type = getField(supplier, ['basic', 'type'], 'type', 'wholesaler');
                  const country = getField(supplier, ['basic', 'country'], 'country', '-');
                  const contactPerson = getField(supplier, ['contact', 'contactPerson', 'name'], 'contactPerson', '-');
                  const phone = getField(supplier, ['contact', 'phone'], 'phone', '-');
                  const email = getField(supplier, ['contact', 'email'], 'email', '-');
                  const isActive = getField(supplier, ['basic', 'isActive'], 'isActive', true);
                  const balance = getField(supplier, ['payment', 'currentBalance'], 'currentBalance', 0);

                  // Balance calculation (positive = we owe them, negative = they owe us)
                  const debit = balance >= 0 ? balance : 0;
                  const credit = balance < 0 ? Math.abs(balance) : 0;

                  const typeLabels: Record<string, string> = {
                    'wholesaler': 'Toptanci',
                    'manufacturer': 'Uretici',
                    'distributor': 'Distributor',
                    'Toptancı': 'Toptanci',
                    'Üretici': 'Uretici',
                    'Distribütör': 'Distributor',
                  };

                  return (
                    <TableRow key={supplier.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm font-medium">
                        {taxId}
                      </TableCell>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-gray-600">
                        {typeLabels[type] || type}
                      </TableCell>
                      <TableCell>
                        {COUNTRY_FLAGS[country] || ''} {country}
                      </TableCell>
                      <TableCell className="text-gray-600">{contactPerson}</TableCell>
                      <TableCell className="text-gray-600">{phone}</TableCell>
                      <TableCell className="text-gray-600">{email}</TableCell>
                      <TableCell className={`text-right ${debit > 0 ? 'text-red-600 font-medium' : ''}`}>
                        €{debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right ${credit > 0 ? 'text-green-600 font-medium' : ''}`}>
                        €{credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : ''}`}>
                        €{balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge isActive={isActive} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(supplier)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Detaylari Goruntule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Duzenle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(supplier)}>
                              {isActive ? '⏸️ Pasif Yap' : '▶️ Aktif Yap'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(supplier)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Supplier Dialog */}
      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
        onSave={() => setDialogOpen(false)}
      />

      {/* Bulk VIES Validation Dialog */}
      <BulkVIESValidationDialog
        open={viesDialogOpen}
        onOpenChange={setViesDialogOpen}
        entityType="supplier"
        entities={suppliers}
      />
    </div>
  );
}
