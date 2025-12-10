'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  Calendar,
  Building2,
  Edit,
  Trash2,
  Eye,
  Download,
  Loader2,
  FileText,
  RefreshCw,
  Store,
  CheckCircle,
  Clock,
  Printer,
  FileCode,
  FileSpreadsheet,
  Upload,
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
import { subscribeToFirestore, deleteFirestoreData, subscribeToBranches } from '@/services/firebase';
import { PurchaseInvoiceDialog } from '@/components/dialogs/purchase-invoice-dialog';
import { XMLInvoiceImportDialog } from '@/components/dialogs/xml-invoice-import-dialog';
import { ExcelInvoiceImportDialog } from '@/components/dialogs/excel-invoice-import-dialog';
import { toast } from 'sonner';

interface PurchaseInvoice {
  id: string;
  invoiceNo?: string;
  invoice_number?: string;
  date?: string;
  invoice_date?: string;
  dueDate?: string;
  due_date?: string;
  supplier?: string;
  supplier_name?: string;
  supplierId?: string;
  supplier_id?: string;
  branchId?: string;
  branch_id?: string;
  items?: any[];
  subtotal?: number;
  vatAmount?: number;
  total_tax?: number;
  total?: number;
  grand_total?: number;
  status?: string;
  paymentStatus?: string;
  notes?: string;
  createdAt?: string;
  created_at?: string;
  createdBy?: string;
}

interface Branch {
  id: string;
  name?: string;
  isActive?: boolean;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Onaylandı', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700' },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Ödenmedi', color: 'bg-red-100 text-red-700' },
  partial: { label: 'Kısmi Ödeme', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Ödendi', color: 'bg-emerald-100 text-emerald-700' },
};

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [xmlImportOpen, setXmlImportOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);

  useEffect(() => {
    // Firebase Firestore'dan alış faturalarını dinle
    const unsubInvoices = subscribeToFirestore('purchases', (data) => {
      if (data) {
        // Sort by date descending
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.date || a.invoice_date || a.createdAt || a.created_at || '').getTime();
          const dateB = new Date(b.date || b.invoice_date || b.createdAt || b.created_at || '').getTime();
          return dateB - dateA;
        });
        setInvoices(sorted);
      } else {
        setInvoices([]);
      }
      setLoading(false);
    });

    const unsubBranches = subscribeToBranches((data) => {
      setBranches(data || []);
    });

    return () => {
      unsubInvoices();
      unsubBranches();
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceNo = invoice.invoiceNo || invoice.invoice_number || '';
      const supplier = invoice.supplier || invoice.supplier_name || '';
      const branchId = invoice.branchId || invoice.branch_id || '';

      const matchesSearch =
        invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' || invoice.status === selectedStatus;
      const matchesBranch =
        selectedBranch === 'all' || branchId === selectedBranch;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [invoices, searchQuery, selectedStatus, selectedBranch]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const totalAmount = invoices.reduce((sum, i) => sum + (i.total || i.grand_total || 0), 0);
    const unpaid = invoices.filter((i) => i.paymentStatus === 'unpaid' || i.status === 'pending').length;
    const unpaidAmount = invoices
      .filter((i) => i.paymentStatus === 'unpaid' || i.status === 'pending')
      .reduce((sum, i) => sum + (i.total || i.grand_total || 0), 0);
    const paidCount = invoices.filter((i) => i.paymentStatus === 'paid' || i.status === 'paid').length;
    const paidAmount = invoices
      .filter((i) => i.paymentStatus === 'paid' || i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || i.grand_total || 0), 0);

    return { total, totalAmount, unpaid, unpaidAmount, paidCount, paidAmount };
  }, [invoices]);

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setDialogOpen(true);
  };

  const handleEditInvoice = (invoice: PurchaseInvoice) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDeleteInvoice = async (invoice: PurchaseInvoice) => {
    const invoiceNo = invoice.invoiceNo || invoice.invoice_number || invoice.id;
    if (confirm(`"${invoiceNo}" faturasini silmek istediginize emin misiniz?`)) {
      try {
        await deleteFirestoreData('purchases', invoice.id);
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

  const getBranchName = (branchId?: string) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || branchId;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alış Faturaları</h1>
          <p className="text-muted-foreground">
            Tedarikçilerden alınan faturalar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                İçe Aktar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setXmlImportOpen(true)}>
                <FileCode className="h-4 w-4 mr-2" />
                XML Fatura (e-Fatura)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExcelImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel Dosyası
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Tutar
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
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
              Ödenmemiş
            </CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unpaid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ödenmemiş Tutar
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.unpaidAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Fatura no veya tedarikci ara..."
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
                  {branches.filter(b => b.isActive !== false).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
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
                <TableHead>Tedarikci</TableHead>
                <TableHead>Sube</TableHead>
                <TableHead className="text-right">Ara Toplam</TableHead>
                <TableHead className="text-right">KDV</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Odeme</TableHead>
                <TableHead className="w-[100px]">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Fatura bulunamadi</h3>
                    <p className="text-muted-foreground">
                      Henuz alis faturasi eklenmemis veya arama kriterlerine uygun sonuc yok.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.slice(0, 100).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium font-mono">
                      {invoice.invoiceNo || invoice.invoice_number || '-'}
                    </TableCell>
                    <TableCell>{formatDate(invoice.date || invoice.invoice_date || invoice.createdAt || new Date())}</TableCell>
                    <TableCell>{invoice.supplier || invoice.supplier_name || '-'}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {getBranchName(invoice.branchId || invoice.branch_id)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(invoice.subtotal || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(invoice.vatAmount || invoice.total_tax || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(invoice.total || invoice.grand_total || 0)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          statusLabels[invoice.status || 'pending']?.color || 'bg-gray-100'
                        }`}
                      >
                        {statusLabels[invoice.status || 'pending']?.label || invoice.status || 'Beklemede'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          paymentStatusLabels[invoice.paymentStatus || 'unpaid']?.color || 'bg-gray-100'
                        }`}
                      >
                        {paymentStatusLabels[invoice.paymentStatus || 'unpaid']?.label || invoice.paymentStatus || 'Odenmedi'}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purchase Invoice Dialog */}
      <PurchaseInvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={editingInvoice}
      />

      {/* XML Invoice Import Dialog */}
      <XMLInvoiceImportDialog
        open={xmlImportOpen}
        onOpenChange={setXmlImportOpen}
      />

      {/* Excel Invoice Import Dialog */}
      <ExcelInvoiceImportDialog
        open={excelImportOpen}
        onOpenChange={setExcelImportOpen}
      />
    </div>
  );
}
