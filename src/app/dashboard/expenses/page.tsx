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
  RefreshCw,
  Store,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Image,
  FileText,
  Tag,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  subscribeToFirestore,
  deleteFirestoreData,
  addFirestoreData,
  updateFirestoreData,
  subscribeToRTDB,
  subscribeToBranches,
  pushData,
  updateData
} from '@/services/firebase';
import { ExpenseDialog } from '@/components/dialogs/expense-dialog';
import { toast } from 'sonner';

// ==================== TYPES ====================
interface Expense {
  id: string;
  documentNumber?: string;
  documentDate?: string;
  date?: string;
  vendor?: string;
  vendorId?: string;
  vendorName?: string;
  category: string;
  categoryName?: string;
  description?: string;
  notes?: string;
  amount?: number;
  netAmount?: number;
  vatAmount?: number;
  ddvAmount?: number;
  ddvRate?: number;
  totalAmount?: number;
  grossAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  branchId?: string;
  branchName?: string;
  createdAt?: any;
  createdBy?: string;
  isActive?: boolean;
}

interface ExpenseVendor {
  id: string;
  name: string;
  category?: string;
  taxId?: string;
  ddvNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  ocrKeywords?: string[];
  isActive?: boolean;
  totalExpenses?: number;
  lastExpenseDate?: string;
}

interface PendingExpense {
  id: string;
  imageUrl?: string;
  ocrText?: string;
  suggestedVendor?: string;
  suggestedAmount?: number;
  suggestedDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  createdBy?: string;
  branchId?: string;
}

interface Branch {
  id: string;
  name?: string;
  isActive?: boolean;
}

// ==================== CONSTANTS ====================
const EXPENSE_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  fuel: { label: 'Yakit', icon: '⛽', color: 'bg-orange-100 text-orange-700' },
  maintenance: { label: 'Bakim/Onarim', icon: '🔧', color: 'bg-amber-100 text-amber-700' },
  insurance: { label: 'Sigorta', icon: '🛡️', color: 'bg-purple-100 text-purple-700' },
  rent: { label: 'Kira', icon: '🏠', color: 'bg-green-100 text-green-700' },
  utilities: { label: 'Faturalar', icon: '💡', color: 'bg-yellow-100 text-yellow-700' },
  supplies: { label: 'Malzeme', icon: '📦', color: 'bg-cyan-100 text-cyan-700' },
  transport: { label: 'Nakliye', icon: '🚚', color: 'bg-indigo-100 text-indigo-700' },
  salary: { label: 'Maas', icon: '👤', color: 'bg-pink-100 text-pink-700' },
  tax: { label: 'Vergi', icon: '📋', color: 'bg-red-100 text-red-700' },
  other: { label: 'Diger', icon: '📁', color: 'bg-gray-100 text-gray-700' },
};

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Nakit',
  bank: 'Banka',
  credit: 'Kredi Karti',
  check: 'Cek',
};

const PAYMENT_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-700' },
  partial: { label: 'Kismi', color: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Odendi', color: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Vadesi Gecti', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Iptal', color: 'bg-gray-100 text-gray-700' },
};

const DDV_RATES = [
  { value: 22, label: '22% - Standart' },
  { value: 9.5, label: '9.5% - Indirimli' },
  { value: 5, label: '5% - Kitap/E-kitap' },
  { value: 0, label: '0% - Muaf' },
];

// ==================== MAIN COMPONENT ====================
export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<ExpenseVendor[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Dialog states
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ExpenseVendor | null>(null);

  // Load data
  useEffect(() => {
    console.log('ExpensesPage: Subscribing to erp_expenses collection...');

    // Masraf fisleri
    const unsubExpenses = subscribeToFirestore('expenses', (data) => {
      console.log('ExpensesPage: Received expenses data:', data?.length || 0, 'items');
      if (data?.length > 0) {
        console.log('ExpensesPage: First expense:', data[0]);
      }
      const activeExpenses = data
        .filter((e: Expense) => e.isActive !== false)
        .sort((a: Expense, b: Expense) => {
          const dateA = a.documentDate || a.date || '';
          const dateB = b.documentDate || b.date || '';
          return dateB.localeCompare(dateA);
        });
      console.log('ExpensesPage: Active expenses:', activeExpenses.length);
      setExpenses(activeExpenses);
      setLoading(false);
    });

    // Masraf carileri - RTDB'den
    const unsubVendors = subscribeToRTDB('expense_vendors', (data) => {
      if (data) {
        const vendorList = data
          .filter((v: any) => v.isActive !== false)
          .map((v: any) => ({
            id: v.id || v._id,
            name: v.name || '',
            category: v.category || 'other',
            taxId: v.taxId || v.ddvNumber || '',
            ddvNumber: v.ddvNumber || '',
            address: v.address || '',
            phone: v.phone || '',
            email: v.email || '',
            ocrKeywords: v.ocrKeywords || [],
            isActive: v.isActive !== false,
            totalExpenses: v.totalExpenses || 0,
            lastExpenseDate: v.lastExpenseDate || '',
          }))
          .sort((a: ExpenseVendor, b: ExpenseVendor) => a.name.localeCompare(b.name));
        setVendors(vendorList);
      }
    });

    // OCR Bekleyenler
    const unsubPending = subscribeToFirestore('pending_expenses', (data) => {
      const pending = data.filter((p: PendingExpense) => p.status === 'pending');
      setPendingExpenses(pending);
    });

    // Subeler
    const unsubBranches = subscribeToBranches((data) => {
      setBranches(data || []);
    });

    return () => {
      unsubExpenses();
      unsubVendors();
      unsubPending();
      unsubBranches();
    };
  }, []);

  // ==================== OVERVIEW TAB ====================
  const overviewStats = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.documentDate || e.date || '');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = expenses.filter(e => {
      const d = new Date(e.documentDate || e.date || '');
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    });

    const thisMonthTotal = thisMonth.reduce((sum, e) => sum + (e.grossAmount || e.totalAmount || 0), 0);
    const lastMonthTotal = lastMonth.reduce((sum, e) => sum + (e.grossAmount || e.totalAmount || 0), 0);
    const change = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    // Kategori bazli dagilim
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + (e.grossAmount || e.totalAmount || 0);
    });

    // Odeme durumu
    const pending = expenses.filter(e => (e.paymentStatus || e.status) === 'pending').length;
    const paid = expenses.filter(e => (e.paymentStatus || e.status) === 'paid').length;
    const overdue = expenses.filter(e => (e.paymentStatus || e.status) === 'overdue').length;

    return {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + (e.grossAmount || e.totalAmount || 0), 0),
      thisMonthTotal,
      lastMonthTotal,
      change,
      byCategory,
      pending,
      paid,
      overdue,
      pendingOCR: pendingExpenses.length,
      vendorCount: vendors.length,
    };
  }, [expenses, pendingExpenses, vendors]);

  // ==================== HANDLERS ====================
  const handleNewExpense = () => {
    setEditingExpense(null);
    setExpenseDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseDialogOpen(true);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const displayName = expense.description || expense.vendorName || 'Bu masraf';
    if (confirm(`"${displayName}" masrafini silmek istediginize emin misiniz?`)) {
      try {
        await deleteFirestoreData('expenses', expense.id);
        toast.success('Masraf silindi');
      } catch (error) {
        toast.error('Silme hatasi: ' + (error as Error).message);
      }
    }
  };

  const handleNewVendor = () => {
    setEditingVendor(null);
    setVendorDialogOpen(true);
  };

  const handleEditVendor = (vendor: ExpenseVendor) => {
    setEditingVendor(vendor);
    setVendorDialogOpen(true);
  };

  const handleApproveOCR = async (pending: PendingExpense) => {
    // OCR onay islemi - masraf fisine cevir
    toast.info('OCR onay islemi yakildi - Masraf fisi olusturulacak');
  };

  const handleRejectOCR = async (pending: PendingExpense) => {
    try {
      await updateFirestoreData('pending_expenses', pending.id, { status: 'rejected' });
      toast.success('OCR kaydi reddedildi');
    } catch (error) {
      toast.error('Hata: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Yukleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Gider Yonetimi</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Masraf fisleri, cariler ve OCR islemleri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button size="sm" onClick={handleNewExpense}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Yeni Masraf</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Genel Ozet
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Building2 className="h-4 w-4" />
            Masraf Carileri
            {vendors.length > 0 && (
              <Badge variant="secondary" className="ml-1">{vendors.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Image className="h-4 w-4" />
            OCR Bekleyenler
            {pendingExpenses.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingExpenses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-2">
            <Receipt className="h-4 w-4" />
            Masraf Fisleri
            {expenses.length > 0 && (
              <Badge variant="secondary" className="ml-1">{expenses.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab stats={overviewStats} expenses={expenses} />
        </TabsContent>

        {/* VENDORS TAB */}
        <TabsContent value="vendors" className="space-y-4">
          <VendorsTab
            vendors={vendors}
            onNew={handleNewVendor}
            onEdit={handleEditVendor}
          />
        </TabsContent>

        {/* PENDING OCR TAB */}
        <TabsContent value="pending" className="space-y-4">
          <PendingTab
            pendingExpenses={pendingExpenses}
            onApprove={handleApproveOCR}
            onReject={handleRejectOCR}
          />
        </TabsContent>

        {/* VOUCHERS TAB */}
        <TabsContent value="vouchers" className="space-y-4">
          <VouchersTab
            expenses={expenses}
            onNew={handleNewExpense}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
          />
        </TabsContent>
      </Tabs>

      {/* Expense Dialog */}
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={editingExpense}
      />

      {/* Vendor Dialog */}
      <VendorDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        vendor={editingVendor}
      />
    </div>
  );
}

// ==================== OVERVIEW TAB COMPONENT ====================
function OverviewTab({ stats, expenses }: { stats: any; expenses: Expense[] }) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Gider
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExpenses}</div>
            <p className="text-xs text-muted-foreground">
              Tum zamanlar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Tutar
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Brut tutar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.thisMonthTotal)}
            </div>
            <div className="flex items-center text-xs">
              {stats.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              )}
              <span className={stats.change >= 0 ? 'text-red-500' : 'text-green-500'}>
                {Math.abs(stats.change).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">gecen aya gore</span>
            </div>
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
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Odeme bekliyor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kategori Dagilimi</CardTitle>
            <CardDescription>Gider kategorilerine gore toplam tutarlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 6)
                .map(([cat, amount]) => {
                  const catInfo = EXPENSE_CATEGORIES[cat] || EXPENSE_CATEGORIES.other;
                  const percentage = stats.totalAmount > 0
                    ? ((amount as number) / stats.totalAmount) * 100
                    : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-lg">{catInfo.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span>{catInfo.label}</span>
                          <span className="font-medium">{formatCurrency(amount as number)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full mt-1">
                          <div
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Odeme Durumu</CardTitle>
            <CardDescription>Masraf fislerinin odeme durumu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span>Odendi</span>
                </div>
                <span className="font-bold text-emerald-600">{stats.paid}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span>Bekliyor</span>
                </div>
                <span className="font-bold text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span>Vadesi Gecti</span>
                </div>
                <span className="font-bold text-red-600">{stats.overdue}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-orange-500" />
                  <span>OCR Bekleyen</span>
                </div>
                <span className="font-bold text-orange-600">{stats.pendingOCR}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son Masraflar</CardTitle>
          <CardDescription>En son eklenen 5 masraf fisi</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Cari</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.slice(0, 5).map((expense) => {
                const catInfo = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES.other;
                const status = expense.paymentStatus || expense.status || 'pending';
                const statusInfo = PAYMENT_STATUSES[status] || PAYMENT_STATUSES.pending;
                return (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.documentDate || expense.date || '')}</TableCell>
                    <TableCell>{expense.vendorName || expense.vendor || '-'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${catInfo.color}`}>
                        {catInfo.icon} {catInfo.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(expense.grossAmount || expense.totalAmount || 0)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ==================== VENDORS TAB COMPONENT ====================
function VendorsTab({
  vendors,
  onNew,
  onEdit
}: {
  vendors: ExpenseVendor[];
  onNew: () => void;
  onEdit: (vendor: ExpenseVendor) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.taxId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Masraf Carileri</h2>
          <p className="text-sm text-muted-foreground">
            Elektrik, kira, sigorta gibi sabit gider carileri
          </p>
        </div>
        <Button onClick={onNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Cari
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Cari</p>
                <p className="text-2xl font-bold">{vendors.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OCR Eslesme</p>
                <p className="text-2xl font-bold">
                  {vendors.filter(v => v.ocrKeywords && v.ocrKeywords.length > 0).length}
                </p>
              </div>
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {vendors.filter(v => v.isActive !== false).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Kategoriler</SelectItem>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>
                    {icon} {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Cari Adi</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>DDV No</TableHead>
                <TableHead className="hidden md:table-cell">OCR Anahtar Kelimeleri</TableHead>
                <TableHead className="text-right">Toplam Gider</TableHead>
                <TableHead className="w-[100px]">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Masraf carisi bulunamadi</h3>
                    <p className="text-muted-foreground">
                      Yeni masraf carisi ekleyerek baslayabilirsiniz.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => {
                  const catInfo = EXPENSE_CATEGORIES[vendor.category || 'other'] || EXPENSE_CATEGORIES.other;
                  return (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${catInfo.color}`}>
                          {catInfo.icon} {catInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {vendor.ddvNumber || vendor.taxId || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {vendor.ocrKeywords && vendor.ocrKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {vendor.ocrKeywords.slice(0, 3).map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                            {vendor.ocrKeywords.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{vendor.ocrKeywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(vendor.totalExpenses || 0)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(vendor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ==================== PENDING OCR TAB COMPONENT ====================
function PendingTab({
  pendingExpenses,
  onApprove,
  onReject
}: {
  pendingExpenses: PendingExpense[];
  onApprove: (p: PendingExpense) => void;
  onReject: (p: PendingExpense) => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">OCR Onay Bekleyenler</h2>
          <p className="text-sm text-muted-foreground">
            Mobil'den gelen fis fotograflari
          </p>
        </div>
        <Button variant="outline" disabled={pendingExpenses.length === 0} className="w-full sm:w-auto">
          <Zap className="h-4 w-4 mr-2" />
          Toplu Onayla
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Bekleyen</p>
                <p className="text-2xl font-bold text-orange-700">{pendingExpenses.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bugun Eklenen</p>
                <p className="text-2xl font-bold">
                  {pendingExpenses.filter(p => {
                    const d = new Date(p.createdAt || '');
                    const today = new Date();
                    return d.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tahmini Tutar</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(pendingExpenses.reduce((sum, p) => sum + (p.suggestedAmount || 0), 0))}
                </p>
              </div>
              <Banknote className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending List */}
      {pendingExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Bekleyen OCR kaydi yok</h3>
            <p className="text-muted-foreground">
              Mobil uygulamadan fis fotografi yuklediginde burada gorunecek.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingExpenses.map((pending) => (
            <Card key={pending.id}>
              <CardContent className="pt-6">
                {/* Image placeholder */}
                <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  {pending.imageUrl ? (
                    <img
                      src={pending.imageUrl}
                      alt="Fis"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Image className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                {/* OCR Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tahmini Cari:</span>
                    <span className="font-medium">{pending.suggestedVendor || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tahmini Tutar:</span>
                    <span className="font-medium font-mono">
                      {formatCurrency(pending.suggestedAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tarih:</span>
                    <span>{formatDate(pending.suggestedDate || pending.createdAt || '')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => onApprove(pending)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Onayla
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(pending)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reddet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ==================== VOUCHERS TAB COMPONENT ====================
function VouchersTab({
  expenses,
  onNew,
  onEdit,
  onDelete
}: {
  expenses: Expense[];
  onNew: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredExpenses = expenses.filter((expense) => {
    const vendorText = expense.vendorName || expense.vendor || '';
    const descText = expense.description || expense.notes || '';
    const matchesSearch =
      vendorText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      descText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || expense.category === selectedCategory;
    const status = expense.paymentStatus || expense.status || 'pending';
    const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + (e.grossAmount || e.totalAmount || 0), 0),
    pending: expenses.filter((e) => (e.paymentStatus || e.status) === 'pending').length,
    thisMonth: expenses.filter((e) => {
      const dateStr = e.documentDate || e.date || '';
      if (!dateStr) return false;
      const expenseDate = new Date(dateStr);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Fis
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
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
            <Banknote className="h-4 w-4 text-muted-foreground" />
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
              Bekleyen
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari veya aciklama ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum Kategoriler</SelectItem>
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum Durumlar</SelectItem>
                    {Object.entries(PAYMENT_STATUSES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={onNew} className="w-full sm:w-auto sm:self-end">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Masraf
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Cari/Tedarikci</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="hidden lg:table-cell">Aciklama</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right hidden sm:table-cell">DDV</TableHead>
                <TableHead className="text-right">Brut</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[100px]">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Masraf bulunamadi</h3>
                    <p className="text-muted-foreground">
                      Henuz masraf fisi eklenmemis veya arama kriterlerine uygun sonuc yok.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const expenseDate = expense.documentDate || expense.date || '';
                  const vendorDisplay = expense.vendorName || expense.vendor || '-';
                  const catInfo = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES.other;
                  const descDisplay = expense.description || expense.notes || '-';
                  const netAmount = expense.netAmount || expense.amount || 0;
                  const vatAmount = expense.ddvAmount || expense.vatAmount || 0;
                  const totalAmount = expense.grossAmount || expense.totalAmount || 0;
                  const status = expense.paymentStatus || expense.status || 'pending';
                  const statusInfo = PAYMENT_STATUSES[status] || PAYMENT_STATUSES.pending;

                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {formatDate(expenseDate)}
                      </TableCell>
                      <TableCell>{vendorDisplay}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${catInfo.color}`}>
                          {catInfo.icon} {catInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate hidden lg:table-cell">
                        {descDisplay}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(netAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground hidden sm:table-cell">
                        {formatCurrency(vatAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onDelete(expense)}
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
    </>
  );
}

// ==================== VENDOR DIALOG ====================
function VendorDialog({
  open,
  onOpenChange,
  vendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: ExpenseVendor | null;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    taxId: '',
    ddvNumber: '',
    address: '',
    phone: '',
    email: '',
    ocrKeywords: '',
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        category: vendor.category || 'other',
        taxId: vendor.taxId || '',
        ddvNumber: vendor.ddvNumber || '',
        address: vendor.address || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        ocrKeywords: (vendor.ocrKeywords || []).join(', '),
      });
    } else {
      setFormData({
        name: '',
        category: 'other',
        taxId: '',
        ddvNumber: '',
        address: '',
        phone: '',
        email: '',
        ocrKeywords: '',
      });
    }
  }, [vendor, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Cari adi zorunludur');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        ocrKeywords: formData.ocrKeywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k),
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (vendor) {
        // Update existing vendor in RTDB
        await updateData(`expense_vendors/${vendor.id}`, data);
        toast.success('Masraf carisi guncellendi');
      } else {
        // Create new vendor in RTDB
        await pushData('expense_vendors', {
          ...data,
          createdAt: new Date().toISOString(),
        });
        toast.success('Masraf carisi eklendi');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Vendor save error:', error);
      toast.error('Hata: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {vendor ? 'Masraf Carisi Duzenle' : 'Yeni Masraf Carisi'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cari Adi *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ornegin: Elektrik Ljubljana"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      {icon} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>DDV No</Label>
              <Input
                value={formData.ddvNumber}
                onChange={(e) => setFormData({ ...formData, ddvNumber: e.target.value })}
                placeholder="SI12345678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adres</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Adres"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+386..."
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>OCR Anahtar Kelimeleri</Label>
            <Textarea
              value={formData.ocrKeywords}
              onChange={(e) => setFormData({ ...formData, ocrKeywords: e.target.value })}
              placeholder="Virgul ile ayrilmis kelimeler: elektrika, elek, power..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Fis fotografindaki metinle eslesecek anahtar kelimeler
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Iptal
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
