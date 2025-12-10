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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { subscribeToFirestore } from '@/services/firebase';
import {
  Plus, RefreshCw, MoreHorizontal, Search, Download, Eye, Pencil, Trash2, Printer,
  FileText, Receipt, FileCheck, Clock, CheckCircle, XCircle
} from 'lucide-react';

// Invoice status badge
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-800',
    'pending': 'bg-amber-100 text-amber-800',
    'paid': 'bg-green-100 text-green-800',
    'overdue': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-600',
  };

  const labels: Record<string, string> = {
    'draft': 'Taslak',
    'pending': 'Beklemede',
    'paid': 'Odendi',
    'overdue': 'Gecikti',
    'cancelled': 'Iptal',
  };

  const icons: Record<string, React.ReactNode> = {
    'draft': <FileText className="h-3 w-3 mr-1" />,
    'pending': <Clock className="h-3 w-3 mr-1" />,
    'paid': <CheckCircle className="h-3 w-3 mr-1" />,
    'overdue': <XCircle className="h-3 w-3 mr-1" />,
    'cancelled': <XCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {icons[status]}
      {labels[status] || status}
    </span>
  );
}

interface Invoice {
  id: string;
  invoiceNo?: string;
  type?: string;
  customerName?: string;
  supplierName?: string;
  date?: string;
  dueDate?: string;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  status?: string;
  items?: any[];
  createdAt?: string;
}

export default function InvoicesPage() {
  const [salesInvoices, setSalesInvoices] = useState<Invoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Load invoices from Firestore
  useEffect(() => {
    setLoading(true);

    const unsubSales = subscribeToFirestore('sale_invoices', (data) => {
      setSalesInvoices(data || []);
    });

    const unsubPurchases = subscribeToFirestore('purchase_invoices', (data) => {
      setPurchaseInvoices(data || []);
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubPurchases();
    };
  }, []);

  // Stats
  const stats = useMemo(() => {
    const salesTotal = salesInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const purchaseTotal = purchaseInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const pendingSales = salesInvoices.filter(inv => inv.status === 'pending').length;
    const pendingPurchases = purchaseInvoices.filter(inv => inv.status === 'pending').length;

    return { salesTotal, purchaseTotal, pendingSales, pendingPurchases };
  }, [salesInvoices, purchaseInvoices]);

  // Filter function
  const filterInvoices = (invoices: Invoice[]) => {
    return invoices
      .filter((inv) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
          (inv.invoiceNo || '').toLowerCase().includes(searchLower) ||
          (inv.customerName || inv.supplierName || '').toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        const matchesDate = !dateFilter || (inv.date && inv.date.startsWith(dateFilter));

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime());
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const InvoiceTable = ({ invoices, type }: { invoices: Invoice[]; type: 'sales' | 'purchase' }) => (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fatura No</TableHead>
            <TableHead>{type === 'sales' ? 'Musteri' : 'Tedarikci'}</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>Vade</TableHead>
            <TableHead className="text-right">Tutar</TableHead>
            <TableHead className="text-right">KDV</TableHead>
            <TableHead className="text-right">Toplam</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                Yukleniyor...
              </TableCell>
            </TableRow>
          ) : filterInvoices(invoices).length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                Fatura bulunamadi
              </TableCell>
            </TableRow>
          ) : (
            filterInvoices(invoices).slice(0, 50).map((inv) => (
              <TableRow key={inv.id} className="hover:bg-gray-50">
                <TableCell className="font-mono font-medium">{inv.invoiceNo || '-'}</TableCell>
                <TableCell>{inv.customerName || inv.supplierName || '-'}</TableCell>
                <TableCell>{inv.date || '-'}</TableCell>
                <TableCell>{inv.dueDate || '-'}</TableCell>
                <TableCell className="text-right">
                  €{(inv.subtotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-gray-600">
                  €{(inv.vatAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  €{(inv.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <StatusBadge status={inv.status || 'pending'} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Goruntule
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Printer className="h-4 w-4 mr-2" />
                        Yazdir
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pencil className="h-4 w-4 mr-2" />
                        Duzenle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
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
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Fatura Yonetimi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Satis ve alis faturalari
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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Rapor
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Fatura
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Satis Faturalari</p>
                <p className="text-xl font-semibold text-green-600">
                  €{stats.salesTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Alis Faturalari</p>
                <p className="text-xl font-semibold text-red-600">
                  €{stats.purchaseTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bekleyen Satis</p>
                <p className="text-xl font-semibold text-amber-600">{stats.pendingSales}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bekleyen Alis</p>
                <p className="text-xl font-semibold text-purple-600">{stats.pendingPurchases}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Fatura ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[180px]"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum durumlar</SelectItem>
              <SelectItem value="draft">Taslak</SelectItem>
              <SelectItem value="pending">Beklemede</SelectItem>
              <SelectItem value="paid">Odendi</SelectItem>
              <SelectItem value="overdue">Gecikti</SelectItem>
              <SelectItem value="cancelled">Iptal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 max-w-md">
            <TabsTrigger value="sales">Satis Faturalari</TabsTrigger>
            <TabsTrigger value="purchase">Alis Faturalari</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <InvoiceTable invoices={salesInvoices} type="sales" />
          </TabsContent>

          <TabsContent value="purchase">
            <InvoiceTable invoices={purchaseInvoices} type="purchase" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
