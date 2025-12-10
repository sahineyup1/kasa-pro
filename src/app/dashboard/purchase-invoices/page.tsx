'use client';

import { useState, useEffect } from 'react';
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
import { PurchaseInvoiceDialog } from '@/components/dialogs/purchase-invoice-dialog';

interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate?: string;
  supplier: string;
  supplierId?: string;
  items: any[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);

  useEffect(() => {
    // Firebase'den alış faturalarını dinle
    const unsubscribe = subscribeToData('purchase_invoices', (data) => {
      if (data) {
        const invoiceList = Object.entries(data).map(([id, inv]: [string, any]) => ({
          id,
          ...inv,
        }));
        // Tarihe göre sırala (en yeni önce)
        invoiceList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInvoices(invoiceList);
      } else {
        setInvoices([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === 'all' || invoice.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
    unpaid: invoices.filter((i) => i.paymentStatus === 'unpaid').length,
    unpaidAmount: invoices
      .filter((i) => i.paymentStatus === 'unpaid')
      .reduce((sum, i) => sum + (i.total || 0), 0),
  };

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setDialogOpen(true);
  };

  const handleEditInvoice = (invoice: PurchaseInvoice) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDeleteInvoice = async (invoice: PurchaseInvoice) => {
    if (confirm(`"${invoice.invoiceNo}" faturasini silmek istediginize emin misiniz?`)) {
      try {
        await removeData(`purchase_invoices/${invoice.id}`);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alış Faturaları</h1>
          <p className="text-muted-foreground">
            Tedarikçilerden alınan faturalar
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                  placeholder="Fatura no veya tedarikçi ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('all')}
                >
                  Tümü
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
                <TableHead>Tedarikçi</TableHead>
                <TableHead className="text-right">Ara Toplam</TableHead>
                <TableHead className="text-right">KDV</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Ödeme</TableHead>
                <TableHead className="w-[100px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Fatura bulunamadı</h3>
                    <p className="text-muted-foreground">
                      Henüz alış faturası eklenmemiş veya arama kriterlerine uygun sonuç yok.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium font-mono">
                      {invoice.invoiceNo}
                    </TableCell>
                    <TableCell>{formatDate(invoice.date)}</TableCell>
                    <TableCell>{invoice.supplier || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(invoice.subtotal || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(invoice.vatAmount || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(invoice.total || 0)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          statusLabels[invoice.status]?.color || 'bg-gray-100'
                        }`}
                      >
                        {statusLabels[invoice.status]?.label || invoice.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          paymentStatusLabels[invoice.paymentStatus]?.color || 'bg-gray-100'
                        }`}
                      >
                        {paymentStatusLabels[invoice.paymentStatus]?.label || invoice.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteInvoice(invoice)}
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
        </CardContent>
      </Card>

      {/* Purchase Invoice Dialog */}
      <PurchaseInvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={editingInvoice}
      />
    </div>
  );
}
