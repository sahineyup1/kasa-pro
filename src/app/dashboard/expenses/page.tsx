'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Calendar,
  Building2,
  Edit,
  Trash2,
  Eye,
  Download,
  Loader2,
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
import { subscribeToFirestore, deleteFirestoreData } from '@/services/firebase';
import { ExpenseDialog } from '@/components/dialogs/expense-dialog';

interface Expense {
  id: string;
  _id?: string;
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

const categoryLabels: Record<string, string> = {
  fuel: 'Yakıt',
  maintenance: 'Bakım/Onarım',
  insurance: 'Sigorta',
  rent: 'Kira',
  utilities: 'Faturalar',
  supplies: 'Malzeme',
  other: 'Diğer',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Onaylandı', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
  paid: { label: 'Ödendi', color: 'bg-blue-100 text-blue-700' },
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    // Firestore'dan masraf fişlerini dinle (erp_expenses collection)
    const unsubscribe = subscribeToFirestore(
      'expenses',
      (data) => {
        // Aktif kayıtları filtrele ve tarihe göre sırala
        const activeExpenses = data
          .filter((e: Expense) => e.isActive !== false)
          .sort((a: Expense, b: Expense) => {
            const dateA = a.documentDate || a.date || '';
            const dateB = b.documentDate || b.date || '';
            return dateB.localeCompare(dateA);
          });
        setExpenses(activeExpenses);
        setLoading(false);
      },
      {
        whereField: 'isActive',
        whereOp: '==',
        whereValue: true,
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredExpenses = expenses.filter((expense) => {
    const vendorText = expense.vendorName || expense.vendor || '';
    const descText = expense.description || expense.notes || '';
    const matchesSearch =
      vendorText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      descText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
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

  const handleNewExpense = () => {
    setEditingExpense(null);
    setDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const displayName = expense.description || expense.vendorName || expense.vendor || 'Bu masraf';
    if (confirm(`"${displayName}" masrafini silmek istediginize emin misiniz?`)) {
      try {
        await deleteFirestoreData('expenses', expense.id);
      } catch (error) {
        console.error('Delete error:', error);
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
          <h1 className="text-3xl font-bold tracking-tight">Masraf Fişleri</h1>
          <p className="text-muted-foreground">
            Masraf ve gider yönetimi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button size="sm" onClick={handleNewExpense}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Masraf
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Masraf
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
              Bekleyen
            </CardTitle>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari veya açıklama ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  Tümü
                </Button>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Cari/Tedarikçi</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="text-right">KDV</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[100px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Masraf bulunamadı</h3>
                    <p className="text-muted-foreground">
                      Henüz masraf fişi eklenmemiş veya arama kriterlerine uygun sonuç yok.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const expenseDate = expense.documentDate || expense.date || '';
                  const vendorDisplay = expense.vendorName || expense.vendor || '-';
                  const categoryDisplay = expense.categoryName || categoryLabels[expense.category] || expense.category || '-';
                  const descDisplay = expense.description || expense.notes || '-';
                  const netAmount = expense.netAmount || expense.amount || 0;
                  const vatAmount = expense.ddvAmount || expense.vatAmount || 0;
                  const totalAmount = expense.grossAmount || expense.totalAmount || 0;
                  const status = expense.paymentStatus || expense.status || 'pending';

                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {formatDate(expenseDate)}
                      </TableCell>
                      <TableCell>{vendorDisplay}</TableCell>
                      <TableCell>{categoryDisplay}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {descDisplay}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(netAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(vatAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            statusLabels[status]?.color || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {statusLabels[status]?.label || status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteExpense(expense)}
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

      {/* Expense Dialog */}
      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
      />
    </div>
  );
}
