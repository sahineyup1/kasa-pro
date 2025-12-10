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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { subscribeToFirestore, addFirestoreData } from '@/services/firebase';
import {
  Plus, RefreshCw, MoreHorizontal, Search, Download,
  Wallet, Building2, CreditCard, TrendingUp, TrendingDown, DollarSign,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// Transaction type badge
function TransactionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    'income': 'bg-green-100 text-green-800',
    'expense': 'bg-red-100 text-red-800',
    'transfer': 'bg-blue-100 text-blue-800',
  };

  const labels: Record<string, string> = {
    'income': 'Giris',
    'expense': 'Cikis',
    'transfer': 'Transfer',
  };

  const icons: Record<string, React.ReactNode> = {
    'income': <ArrowUpRight className="h-3 w-3 mr-1" />,
    'expense': <ArrowDownRight className="h-3 w-3 mr-1" />,
    'transfer': <span className="mr-1">↔️</span>,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      {icons[type]}
      {labels[type] || type}
    </span>
  );
}

interface Transaction {
  id: string;
  date?: string;
  type?: string;
  category?: string;
  amount?: number;
  description?: string;
  account?: string;
  accountType?: string;
  reference?: string;
  branch?: string;
  createdAt?: string;
}

interface Account {
  id: string;
  name?: string;
  type?: string;
  balance?: number;
  currency?: string;
  bankName?: string;
  iban?: string;
  branch?: string;
}

// Category options
const EXPENSE_CATEGORIES = [
  { value: 'salary', label: 'Maas' },
  { value: 'rent', label: 'Kira' },
  { value: 'utilities', label: 'Faturalar' },
  { value: 'supplies', label: 'Malzeme' },
  { value: 'maintenance', label: 'Bakim' },
  { value: 'transport', label: 'Ulasim' },
  { value: 'other', label: 'Diger' },
];

const INCOME_CATEGORIES = [
  { value: 'sales', label: 'Satis' },
  { value: 'service', label: 'Hizmet' },
  { value: 'refund', label: 'Iade' },
  { value: 'other', label: 'Diger' },
];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Load transactions and accounts from Firestore
  useEffect(() => {
    setLoading(true);

    const unsubTransactions = subscribeToFirestore('transactions', (data) => {
      setTransactions(data || []);
      setLoading(false);
    });

    const unsubAccounts = subscribeToFirestore('accounts', (data) => {
      setAccounts(data || []);
    });

    return () => {
      unsubTransactions();
      unsubAccounts();
    };
  }, []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search filter
        const desc = tx.description || '';
        const ref = tx.reference || '';
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
          desc.toLowerCase().includes(searchLower) ||
          ref.toLowerCase().includes(searchLower);

        // Type filter
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;

        // Account filter
        const matchesAccount = accountFilter === 'all' || tx.account === accountFilter || tx.accountType === accountFilter;

        // Date filter
        const matchesDate = !dateFilter || (tx.date && tx.date.startsWith(dateFilter));

        return matchesSearch && matchesType && matchesAccount && matchesDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || '');
        const dateB = new Date(b.date || b.createdAt || '');
        return dateB.getTime() - dateA.getTime();
      });
  }, [transactions, searchQuery, typeFilter, accountFilter, dateFilter]);

  // Stats for dashboard
  const stats = useMemo(() => {
    // Calculate total balances from accounts
    const cashBalance = accounts
      .filter(a => a.type === 'cash')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const bankBalance = accounts
      .filter(a => a.type === 'bank')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalBalance = cashBalance + bankBalance;

    // Today's transactions
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(tx =>
      tx.date?.startsWith(today) || tx.createdAt?.startsWith(today)
    );

    const todayIncome = todayTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const todayExpense = todayTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const todayNet = todayIncome - todayExpense;

    return { cashBalance, bankBalance, totalBalance, todayIncome, todayExpense, todayNet };
  }, [transactions, accounts]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleAddTransaction = async (type: 'income' | 'expense') => {
    // In production, this would open a dialog
    const description = prompt(`${type === 'income' ? 'Giris' : 'Cikis'} aciklamasi:`);
    if (!description) return;

    const amountStr = prompt('Tutar (EUR):');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Gecersiz tutar!');
      return;
    }

    try {
      await addFirestoreData('transactions', {
        date: new Date().toISOString().split('T')[0],
        type,
        amount,
        description,
        category: type === 'income' ? 'sales' : 'other',
        accountType: 'cash',
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      alert('Islem eklenemedi: ' + (error as Error).message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Finans Yonetimi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kasa, banka ve nakit akisi yonetimi
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
            <Button
              variant="outline"
              className="bg-green-600 hover:bg-green-700 text-white border-0"
              onClick={() => handleAddTransaction('income')}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Giris
            </Button>
            <Button
              variant="outline"
              className="bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={() => handleAddTransaction('expense')}
            >
              <ArrowDownRight className="h-4 w-4 mr-2" />
              Cikis
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard">Finans Ozeti</TabsTrigger>
            <TabsTrigger value="cash">Kasa</TabsTrigger>
            <TabsTrigger value="bank">Banka</TabsTrigger>
            <TabsTrigger value="credits">Krediler</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            {/* Stats Cards */}
            <div className="grid grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg border-l-4 border-l-green-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kasa Bakiyesi</p>
                    <p className="text-xl font-semibold text-green-600">
                      €{stats.cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-blue-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Banka Bakiyesi</p>
                    <p className="text-xl font-semibold text-blue-600">
                      €{stats.bankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-purple-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Varlik</p>
                    <p className="text-xl font-semibold text-purple-600">
                      €{stats.totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-green-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bugun Giris</p>
                    <p className="text-xl font-semibold text-green-600">
                      €{stats.todayIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-red-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bugun Cikis</p>
                    <p className="text-xl font-semibold text-red-600">
                      €{stats.todayExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-amber-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bugun Net</p>
                    <p className={`text-xl font-semibold ${stats.todayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{stats.todayNet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Islem ara..."
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

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum tipler</SelectItem>
                  <SelectItem value="income">Giris</SelectItem>
                  <SelectItem value="expense">Cikis</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>

              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Hesap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum hesaplar</SelectItem>
                  <SelectItem value="cash">Kasa</SelectItem>
                  <SelectItem value="bank">Banka</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Aciklama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Hesap</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchQuery || typeFilter !== 'all' || accountFilter !== 'all' || dateFilter
                          ? 'Filtrelere uygun islem bulunamadi'
                          : 'Henuz islem eklenmemis'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.slice(0, 50).map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {tx.date || tx.createdAt?.split('T')[0] || '-'}
                        </TableCell>
                        <TableCell>
                          <TransactionTypeBadge type={tx.type || 'other'} />
                        </TableCell>
                        <TableCell>{tx.description || '-'}</TableCell>
                        <TableCell className="text-gray-600">{tx.category || '-'}</TableCell>
                        <TableCell className="text-gray-600">
                          {tx.accountType === 'cash' ? '💵 Kasa' : tx.accountType === 'bank' ? '🏦 Banka' : tx.accountType || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : ''}`}>
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          €{(tx.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Detaylar</DropdownMenuItem>
                              <DropdownMenuItem>Duzenle</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Sil</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Cash Tab */}
          <TabsContent value="cash">
            <div className="bg-white rounded-lg border p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Kasa Islemleri</h3>
              <p className="text-gray-500 mb-4">
                Gunluk kasa acilis, nakit satis, tahsilat ve kasa kapanisi islemleri
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => handleAddTransaction('income')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Kasaya Giris
                </Button>
                <Button variant="outline" onClick={() => handleAddTransaction('expense')}>
                  <ArrowDownRight className="h-4 w-4 mr-2" />
                  Kasadan Cikis
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <div className="bg-white rounded-lg border p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Banka Hesaplari</h3>
              <p className="text-gray-500 mb-4">
                Banka hesaplari, havale/EFT islemleri ve banka mutabakati
              </p>
              <div className="flex justify-center gap-4">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Banka Hesabi Ekle
                </Button>
                <Button variant="outline">
                  Havale/EFT
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits">
            <div className="bg-white rounded-lg border p-8 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Kredi Yonetimi</h3>
              <p className="text-gray-500 mb-4">
                Banka kredileri, taksit planlari ve odeme takibi
              </p>
              <div className="flex justify-center gap-4">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Kredi Ekle
                </Button>
                <Button variant="outline">
                  Taksit Ode
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
