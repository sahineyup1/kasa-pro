'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Receipt,
  Calendar,
  Building2,
  Edit,
  Trash2,
  Eye,
  Download,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Store,
  Printer,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCachedFirestoreCollection, deleteFirestoreData, getCachedDataArray } from '@/services/firebase';
import { SaleInvoiceDialog } from '@/components/dialogs/sale-invoice-dialog';
import { toast } from 'sonner';

interface SaleInvoice {
  id: string;
  invoiceNumber?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  date?: string;
  customer?: {
    name?: string;
    taxId?: string;
    address?: string;
  };
  customerName?: string;
  customerId?: string;
  branchId?: string;
  items?: any[];
  subtotal?: number;
  discountRate?: number;
  discountAmount?: number;
  totalTax?: number;
  vatAmount?: number;
  total?: number;
  paymentMethod?: string;
  paidAmount?: number;
  remainingAmount?: number;
  status?: string;
  furs?: {
    zoi?: string;
    eor?: string;
    qr_code_url?: string;
  };
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

interface Branch {
  id: string;
  name?: string;
  isActive?: boolean;
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  paid: { label: 'Odendi', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  partial: { label: 'Kismi Odeme', color: 'bg-amber-100 text-amber-700', icon: Clock },
  cancelled: { label: 'Iptal', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const paymentMethodLabels: Record<string, { label: string; icon: any }> = {
  cash: { label: 'Nakit', icon: Banknote },
  credit_card: { label: 'Kredi Karti', icon: CreditCard },
  bank_transfer: { label: 'Havale/EFT', icon: Building2 },
};

// Sabit Şube Listesi
const BRANCHES: Record<string, { name: string; icon: string; color: string }> = {
  merkez: { name: 'Merkez Depo', icon: '🏭', color: 'bg-blue-100 text-blue-700' },
  balkan: { name: 'Balkan Market', icon: '🛒', color: 'bg-green-100 text-green-700' },
  desetka: { name: 'Desetka Market', icon: '🛒', color: 'bg-emerald-100 text-emerald-700' },
  mesnica: { name: 'Mesnica Kasap', icon: '🥩', color: 'bg-red-100 text-red-700' },
};

export default function SaleInvoicesPage() {
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SaleInvoice | null>(null);

  // ONE-TIME FETCH - Firebase maliyetini düşürür (5 dakika cache)
  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoiceData, branchData] = await Promise.all([
          getCachedFirestoreCollection('sale_invoices'),
          getCachedDataArray('company/branches'),
        ]);

        if (invoiceData) {
          const sorted = [...invoiceData].sort((a, b) => {
            const dateA = new Date(a.invoiceDate || a.date || a.createdAt || '').getTime();
            const dateB = new Date(b.invoiceDate || b.date || b.createdAt || '').getTime();
            return dateB - dateA;
          });
          setInvoices(sorted);
        }

        setBranches(branchData || []);
      } catch (error) {
        console.error('Load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceNo = invoice.invoiceNumber || invoice.invoiceNo || '';
      const customerName = invoice.customer?.name || invoice.customerName || '';

      const matchesSearch =
        invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
      const matchesBranch = selectedBranch === 'all' || invoice.branchId === selectedBranch;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [invoices, searchQuery, selectedStatus, selectedBranch]);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const totalAmount = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const paidCount = invoices.filter((i) => i.status === 'paid').length;
    const paidAmount = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0);
    const pendingCount = invoices.filter((i) => i.status === 'pending' || i.status === 'partial').length;
    const pendingAmount = invoices
      .filter((i) => i.status === 'pending' || i.status === 'partial')
      .reduce((sum, i) => sum + ((i.total || 0) - (i.paidAmount || 0)), 0);

    return { total, totalAmount, paidCount, paidAmount, pendingCount, pendingAmount };
  }, [invoices]);

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setDialogOpen(true);
  };

  const handleEditInvoice = (invoice: SaleInvoice) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDeleteInvoice = async (invoice: SaleInvoice) => {
    const invoiceNo = invoice.invoiceNumber || invoice.invoiceNo || invoice.id;
    if (confirm(`"${invoiceNo}" faturasini silmek istediginize emin misiniz?`)) {
      try {
        await deleteFirestoreData('sale_invoices', invoice.id);
        toast.success('Fatura silindi');
      } catch (error) {
        toast.error('Silme hatasi: ' + (error as Error).message);
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const getBranchInfo = (branchId?: string) => {
    if (!branchId) return { name: '-', icon: '', color: 'bg-gray-100 text-gray-700' };
    return BRANCHES[branchId] || { name: branchId, icon: '', color: 'bg-gray-100 text-gray-700' };
  };

  // Şube bazlı satış özeti
  const branchStats = useMemo(() => {
    return Object.entries(BRANCHES).map(([branchId, branchInfo]) => {
      const branchInvoices = invoices.filter((i) => i.branchId === branchId);
      return {
        branchId,
        ...branchInfo,
        count: branchInvoices.length,
        total: branchInvoices.reduce((sum, i) => sum + (i.total || 0), 0),
        vatAmount: branchInvoices.reduce((sum, i) => sum + (i.vatAmount || i.totalTax || 0), 0),
      };
    });
  }, [invoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Yukleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Satis Faturalari</h1>
          <p className="text-muted-foreground">
            Musterilere kesilen faturalar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button size="sm" onClick={handleNewInvoice}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Fatura
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Fatura
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">fatura</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Tutar
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Odenen
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.paidAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.paidCount} fatura</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekleyen
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.pendingCount} fatura</p>
          </CardContent>
        </Card>
      </div>

      {/* Şube Bazlı Satış Özeti */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Store className="h-4 w-4" />
            Sube Bazli Satis Ozeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {branchStats.map((branch) => (
              <button
                key={branch.branchId}
                onClick={() => setSelectedBranch(branch.branchId)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                  selectedBranch === branch.branchId
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-muted hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{branch.icon}</span>
                  <span className="text-xs font-medium truncate">{branch.name}</span>
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(branch.total)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {branch.count} fatura • KDV: {formatCurrency(branch.vatAmount)}
                </div>
              </button>
            ))}
          </div>
          {selectedBranch !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setSelectedBranch('all')}
            >
              Filtreyi Temizle
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Fatura no veya musteri ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px]">
                  <Store className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sube" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Subeler</SelectItem>
                  {Object.entries(BRANCHES).map(([key, { name, icon }]) => (
                    <SelectItem key={key} value={key}>
                      {icon} {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('all')}
                >
                  Tumu
                </Button>
                {Object.entries(statusLabels).map(([key, { label }]) => (
                  <Button
                    key={key}
                    variant={selectedStatus === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fatura No</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Musteri</TableHead>
                <TableHead>Sube</TableHead>
                <TableHead className="text-right">Ara Toplam</TableHead>
                <TableHead className="text-right">KDV</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead>Odeme</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[100px]">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Fatura bulunamadi</h3>
                    <p className="text-muted-foreground">
                      Henuz satis faturasi eklenmemis veya arama kriterlerine uygun sonuc yok.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.slice(0, 100).map((invoice) => {
                  const StatusIcon = statusLabels[invoice.status || 'pending']?.icon || Clock;
                  const PaymentIcon = paymentMethodLabels[invoice.paymentMethod || 'cash']?.icon || Banknote;

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium font-mono">
                        {invoice.invoiceNumber || invoice.invoiceNo || '-'}
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.invoiceDate || invoice.date || invoice.createdAt || new Date())}
                      </TableCell>
                      <TableCell>
                        {invoice.customer?.name || invoice.customerName || '-'}
                      </TableCell>
                      <TableCell>
                        {invoice.branchId ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getBranchInfo(invoice.branchId).color}`}>
                            {getBranchInfo(invoice.branchId).icon} {getBranchInfo(invoice.branchId).name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.subtotal || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(invoice.totalTax || invoice.vatAmount || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(invoice.total || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PaymentIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">
                            {paymentMethodLabels[invoice.paymentMethod || 'cash']?.label || invoice.paymentMethod}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                            statusLabels[invoice.status || 'pending']?.color || 'bg-gray-100'
                          }`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusLabels[invoice.status || 'pending']?.label || invoice.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Goruntule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Duzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 mr-2" />
                              Yazdir
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteInvoice(invoice)}
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
        </CardContent>
      </Card>

      {/* Sale Invoice Dialog */}
      <SaleInvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={editingInvoice}
      />
    </div>
  );
}
