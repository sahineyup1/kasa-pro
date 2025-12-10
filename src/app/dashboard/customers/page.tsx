'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Filter,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency } from '@/lib/utils';
import { subscribeToRTDB, removeData } from '@/services/firebase';
import { CustomerDialog } from '@/components/dialogs/customer-dialog';

interface Customer {
  id: string;
  // Basic info
  code?: string;
  name?: string;
  companyName?: string;
  type?: string; // individual, company
  status?: string; // active, inactive, blocked
  customerGroup?: string;
  // Contact
  email?: string;
  phone?: string;
  mobile?: string;
  // Address
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  // Financial
  vatNumber?: string;
  taxNumber?: string;
  balance?: number;
  creditLimit?: number;
  discount?: number;
  paymentTerms?: number;
  // Meta
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  isActive?: boolean;
  // Nested structure support (Python ERP format)
  basic?: {
    code?: string;
    name?: string;
    type?: string;
    status?: string;
    customerGroup?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    mobile?: string;
  };
  addressInfo?: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
  financial?: {
    vatNumber?: string;
    taxNumber?: string;
    balance?: number;
    creditLimit?: number;
    discount?: number;
    paymentTerms?: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  inactive: { label: 'Pasif', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  blocked: { label: 'Blokeli', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const typeConfig: Record<string, { label: string; icon: any }> = {
  individual: { label: 'Bireysel', icon: Users },
  company: { label: 'Kurumsal', icon: Building2 },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    // RTDB'den müşterileri dinle
    const unsubscribe = subscribeToRTDB('customers', (data) => {
      const activeCustomers = data
        .filter((c: Customer) => c.isActive !== false)
        .sort((a: Customer, b: Customer) => {
          const nameA = a.basic?.name || a.name || a.companyName || '';
          const nameB = b.basic?.name || b.name || b.companyName || '';
          return nameA.localeCompare(nameB);
        });
      setCustomers(activeCustomers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper: Get customer field (supports both flat and nested structure)
  const getField = (customer: Customer, field: string): any => {
    // Flat structure
    if ((customer as any)[field] !== undefined) {
      return (customer as any)[field];
    }

    // Nested structure (Python ERP format)
    const fieldMap: Record<string, string[]> = {
      code: ['basic', 'code'],
      name: ['basic', 'name'],
      type: ['basic', 'type'],
      status: ['basic', 'status'],
      customerGroup: ['basic', 'customerGroup'],
      email: ['contact', 'email'],
      phone: ['contact', 'phone'],
      mobile: ['contact', 'mobile'],
      address: ['addressInfo', 'street'],
      city: ['addressInfo', 'city'],
      country: ['addressInfo', 'country'],
      postalCode: ['addressInfo', 'postalCode'],
      vatNumber: ['financial', 'vatNumber'],
      taxNumber: ['financial', 'taxNumber'],
      balance: ['financial', 'balance'],
      creditLimit: ['financial', 'creditLimit'],
      discount: ['financial', 'discount'],
      paymentTerms: ['financial', 'paymentTerms'],
    };

    const path = fieldMap[field];
    if (path) {
      const [section, key] = path;
      return (customer as any)[section]?.[key];
    }

    return undefined;
  };

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const name = getField(customer, 'name') || getField(customer, 'companyName') || '';
    const code = getField(customer, 'code') || '';
    const email = getField(customer, 'email') || '';
    const phone = getField(customer, 'phone') || '';
    const status = getField(customer, 'status') || 'active';
    const type = getField(customer, 'type') || 'company';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesType = typeFilter === 'all' || type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: customers.length,
    active: customers.filter((c) => (getField(c, 'status') || 'active') === 'active').length,
    blocked: customers.filter((c) => getField(c, 'status') === 'blocked').length,
    totalBalance: customers.reduce((sum, c) => sum + (getField(c, 'balance') || 0), 0),
  };

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    const name = getField(customer, 'name') || getField(customer, 'companyName') || 'Bu müşteri';
    if (confirm(`"${name}" müşterisini silmek istediğinize emin misiniz?`)) {
      try {
        await removeData(`customers/${customer.id}`);
      } catch (error) {
        console.error('Delete error:', error);
        alert('Silme hatası: ' + (error as Error).message);
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    // subscribeToFirestore zaten real-time, bu sadece UI feedback için
    setTimeout(() => setLoading(false), 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Müşteriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="text-muted-foreground">
            Müşteri kayıtlarını yönetin ve takip edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleNewCustomer}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Müşteri
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Müşteri</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif Müşteri</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blokeli</p>
                <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Bakiye</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri ara (isim, kod, email, telefon)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
                <SelectItem value="blocked">Blokeli</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                <SelectItem value="individual">Bireysel</SelectItem>
                <SelectItem value="company">Kurumsal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Müşteri Listesi
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredCustomers.length} kayıt)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Müşteri Adı</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>İletişim</TableHead>
                <TableHead>Şehir</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[100px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Müşteri bulunamadı</h3>
                    <p className="text-muted-foreground">
                      Henüz müşteri eklenmemiş veya arama kriterlerine uygun sonuç yok.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const code = getField(customer, 'code') || '-';
                  const name = getField(customer, 'name') || getField(customer, 'companyName') || '-';
                  const type = getField(customer, 'type') || 'company';
                  const email = getField(customer, 'email') || '';
                  const phone = getField(customer, 'phone') || getField(customer, 'mobile') || '';
                  const city = getField(customer, 'city') || '-';
                  const balance = getField(customer, 'balance') || 0;
                  const status = getField(customer, 'status') || 'active';

                  const statusInfo = statusConfig[status] || statusConfig.active;
                  const typeInfo = typeConfig[type] || typeConfig.company;
                  const StatusIcon = statusInfo.icon;
                  const TypeIcon = typeInfo.icon;

                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono text-sm">{code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{typeInfo.label}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {email}
                            </div>
                          )}
                          {phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{city}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={balance < 0 ? 'text-red-600' : ''}>
                          {formatCurrency(balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteCustomer(customer)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editingCustomer}
        onSave={() => setDialogOpen(false)}
      />
    </div>
  );
}
