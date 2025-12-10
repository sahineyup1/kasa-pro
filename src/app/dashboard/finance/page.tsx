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
import { Progress } from '@/components/ui/progress';
import { subscribeToFirestore, deleteFirestoreData } from '@/services/firebase';
import { toast } from 'sonner';
import {
  Plus, RefreshCw, MoreHorizontal, Search, Download, FileSpreadsheet,
  Wallet, Building2, CreditCard, TrendingUp, TrendingDown, DollarSign,
  ArrowUpRight, ArrowDownRight, Eye, Edit, Trash2, Calculator,
  ChevronRight, PiggyBank, Landmark, Receipt, FileText, AlertCircle,
  CheckCircle, Clock, Settings, List
} from 'lucide-react';

// Import dialogs
import {
  BankAccountDialog,
  BankTransactionDialog,
  BankAccountsListDialog
} from '@/components/dialogs/bank-dialog';
import {
  CashOpenDialog,
  CashCloseDialog,
  CashTransactionDialog
} from '@/components/dialogs/cash-dialog';
import {
  CreditDialog,
  CreditDetailDialog,
  CreditPaymentDialog
} from '@/components/dialogs/credit-dialog';

// Types
interface Transaction {
  id: string;
  date?: string;
  type?: string;
  category?: string;
  amount?: number;
  description?: string;
  account?: string;
  accountId?: string;
  accountType?: string;
  reference?: string;
  branch?: string;
  createdAt?: string;
}

interface BankAccount {
  id: string;
  name?: string;
  bankName?: string;
  iban?: string;
  currency?: string;
  balance?: number;
  branch?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface CashRegister {
  id: string;
  date?: string;
  openingBalance?: number;
  closingBalance?: number;
  expectedBalance?: number;
  status?: 'open' | 'closed';
  openedBy?: string;
  closedBy?: string;
  openedAt?: string;
  closedAt?: string;
  notes?: string;
}

interface Credit {
  id: string;
  bankName?: string;
  creditType?: string;
  amount?: number;
  interestRate?: number;
  term?: number;
  monthlyPayment?: number;
  startDate?: string;
  endDate?: string;
  paidAmount?: number;
  remainingAmount?: number;
  status?: 'active' | 'completed' | 'defaulted';
  payments?: CreditPayment[];
  createdAt?: string;
}

interface CreditPayment {
  id: string;
  creditId?: string;
  paymentNumber?: number;
  dueDate?: string;
  paidDate?: string;
  amount?: number;
  principal?: number;
  interest?: number;
  status?: 'pending' | 'paid' | 'late';
}

// Transaction type badge
function TransactionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    'income': 'bg-green-100 text-green-800',
    'expense': 'bg-red-100 text-red-800',
    'transfer': 'bg-blue-100 text-blue-800',
    'deposit': 'bg-green-100 text-green-800',
    'withdrawal': 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    'income': 'Giris',
    'expense': 'Cikis',
    'transfer': 'Transfer',
    'deposit': 'Yatirma',
    'withdrawal': 'Cekme',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  );
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'active': 'bg-green-100 text-green-800',
    'completed': 'bg-blue-100 text-blue-800',
    'defaulted': 'bg-red-100 text-red-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'paid': 'bg-green-100 text-green-800',
    'late': 'bg-red-100 text-red-800',
    'open': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800',
  };

  const labels: Record<string, string> = {
    'active': 'Aktif',
    'completed': 'Tamamlandi',
    'defaulted': 'Temerrut',
    'pending': 'Bekliyor',
    'paid': 'Odendi',
    'late': 'Gecikti',
    'open': 'Acik',
    'closed': 'Kapali',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

export default function FinancePage() {
  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [creditStatusFilter, setCreditStatusFilter] = useState('all');

  // Dialog states - Bank
  const [bankAccountDialogOpen, setBankAccountDialogOpen] = useState(false);
  const [bankTransactionDialogOpen, setBankTransactionDialogOpen] = useState(false);
  const [bankAccountsListOpen, setBankAccountsListOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);

  // Dialog states - Cash
  const [cashOpenDialogOpen, setCashOpenDialogOpen] = useState(false);
  const [cashCloseDialogOpen, setCashCloseDialogOpen] = useState(false);
  const [cashTransactionDialogOpen, setCashTransactionDialogOpen] = useState(false);
  const [cashTransactionType, setCashTransactionType] = useState<'income' | 'expense'>('income');

  // Dialog states - Credits
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditDetailDialogOpen, setCreditDetailDialogOpen] = useState(false);
  const [creditPaymentDialogOpen, setCreditPaymentDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);

  // Load data from Firestore
  useEffect(() => {
    setLoading(true);

    const unsubTransactions = subscribeToFirestore('transactions', (data) => {
      setTransactions(data || []);
      setLoading(false);
    });

    const unsubBankAccounts = subscribeToFirestore('bankAccounts', (data) => {
      setBankAccounts(data || []);
    });

    const unsubCashRegisters = subscribeToFirestore('cashRegisters', (data) => {
      setCashRegisters(data || []);
    });

    const unsubCredits = subscribeToFirestore('credits', (data) => {
      setCredits(data || []);
    });

    const unsubCreditPayments = subscribeToFirestore('creditPayments', (data) => {
      setCreditPayments(data || []);
    });

    return () => {
      unsubTransactions();
      unsubBankAccounts();
      unsubCashRegisters();
      unsubCredits();
      unsubCreditPayments();
    };
  }, []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const desc = tx.description || '';
        const ref = tx.reference || '';
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
          desc.toLowerCase().includes(searchLower) ||
          ref.toLowerCase().includes(searchLower);

        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const matchesAccount = accountFilter === 'all' || tx.accountId === accountFilter || tx.accountType === accountFilter;
        const matchesDate = !dateFilter || (tx.date && tx.date.startsWith(dateFilter));

        return matchesSearch && matchesType && matchesAccount && matchesDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || '');
        const dateB = new Date(b.date || b.createdAt || '');
        return dateB.getTime() - dateA.getTime();
      });
  }, [transactions, searchQuery, typeFilter, accountFilter, dateFilter]);

  // Filter credits
  const filteredCredits = useMemo(() => {
    return credits.filter(c => {
      if (creditStatusFilter === 'all') return true;
      return c.status === creditStatusFilter;
    });
  }, [credits, creditStatusFilter]);

  // Stats calculations
  const stats = useMemo(() => {
    // Cash balance (from latest open register or transactions)
    const latestCashRegister = cashRegisters
      .filter(r => r.status === 'open')
      .sort((a, b) => new Date(b.openedAt || '').getTime() - new Date(a.openedAt || '').getTime())[0];

    const cashBalance = latestCashRegister?.openingBalance || 0;

    // Bank total
    const bankBalance = bankAccounts
      .filter(a => a.isActive !== false)
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    // Credit totals
    const totalCreditDebt = credits
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    const totalAssets = cashBalance + bankBalance;
    const netWorth = totalAssets - totalCreditDebt;

    // Today's transactions
    const today = new Date().toISOString().split('T')[0];
    const todayTx = transactions.filter(tx =>
      tx.date?.startsWith(today) || tx.createdAt?.startsWith(today)
    );

    const todayIncome = todayTx
      .filter(tx => tx.type === 'income' || tx.type === 'deposit')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const todayExpense = todayTx
      .filter(tx => tx.type === 'expense' || tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Upcoming credit payments
    const upcomingPayments = creditPayments
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
      .slice(0, 5);

    return {
      cashBalance,
      bankBalance,
      totalAssets,
      totalCreditDebt,
      netWorth,
      todayIncome,
      todayExpense,
      upcomingPayments,
      activeCredits: credits.filter(c => c.status === 'active').length,
    };
  }, [transactions, bankAccounts, cashRegisters, credits, creditPayments]);

  // Current cash register status
  const currentCashRegister = useMemo(() => {
    return cashRegisters
      .filter(r => r.status === 'open')
      .sort((a, b) => new Date(b.openedAt || '').getTime() - new Date(a.openedAt || '').getTime())[0];
  }, [cashRegisters]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  // Bank handlers
  const handleEditBankAccount = (account: BankAccount) => {
    setSelectedBankAccount(account);
    setBankAccountDialogOpen(true);
  };

  const handleDeleteBankAccount = async (account: BankAccount) => {
    if (!confirm(`"${account.name}" hesabini silmek istediginize emin misiniz?`)) return;
    try {
      await deleteFirestoreData('bankAccounts', account.id);
      toast.success('Banka hesabi silindi');
    } catch (error) {
      toast.error('Hesap silinemedi: ' + (error as Error).message);
    }
  };

  // Credit handlers
  const handleViewCredit = (credit: Credit) => {
    setSelectedCredit(credit);
    setCreditDetailDialogOpen(true);
  };

  const handleEditCredit = (credit: Credit) => {
    setSelectedCredit(credit);
    setCreditDialogOpen(true);
  };

  const handlePayCredit = (credit: Credit) => {
    setSelectedCredit(credit);
    setCreditPaymentDialogOpen(true);
  };

  const handleDeleteCredit = async (credit: Credit) => {
    if (!confirm(`"${credit.bankName}" kredisini silmek istediginize emin misiniz?`)) return;
    try {
      await deleteFirestoreData('credits', credit.id);
      toast.success('Kredi silindi');
    } catch (error) {
      toast.error('Kredi silinemedi: ' + (error as Error).message);
    }
  };

  // Export to Excel
  const handleExport = (type: string) => {
    toast.info(`${type} raporu hazirlaniyor...`);
    // TODO: Implement actual Excel export
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Finans Yonetimi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kasa, banka, kredi ve hazine yonetimi
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="dashboard">
              <TrendingUp className="h-4 w-4 mr-2" />
              Hazine Ozeti
            </TabsTrigger>
            <TabsTrigger value="cash">
              <Wallet className="h-4 w-4 mr-2" />
              Kasa
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Building2 className="h-4 w-4 mr-2" />
              Banka
            </TabsTrigger>
            <TabsTrigger value="credits">
              <CreditCard className="h-4 w-4 mr-2" />
              Krediler
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Receipt className="h-4 w-4 mr-2" />
              Islemler
            </TabsTrigger>
            <TabsTrigger value="export">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* ==================== HAZINE OZETI TAB ==================== */}
          <TabsContent value="dashboard">
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg border-l-4 border-l-green-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kasa</p>
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
                    <p className="text-sm text-gray-600">Banka</p>
                    <p className="text-xl font-semibold text-blue-600">
                      €{stats.bankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-purple-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PiggyBank className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Varlik</p>
                    <p className="text-xl font-semibold text-purple-600">
                      €{stats.totalAssets.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-red-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kredi Borcu</p>
                    <p className="text-xl font-semibold text-red-600">
                      €{stats.totalCreditDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
                    <p className="text-sm text-gray-600">Net Deger</p>
                    <p className={`text-xl font-semibold ${stats.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{stats.netWorth.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Bank Accounts */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Banka Hesaplari
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBankAccountsListOpen(true)}
                  >
                    Tumu <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="p-4">
                  {bankAccounts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Henuz banka hesabi yok</p>
                  ) : (
                    <div className="space-y-3">
                      {bankAccounts.slice(0, 4).map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-gray-500">{account.bankName}</p>
                          </div>
                          <p className="font-semibold text-blue-600">
                            €{(account.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Active Credits */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-red-600" />
                    Aktif Krediler ({stats.activeCredits})
                  </h3>
                </div>
                <div className="p-4">
                  {credits.filter(c => c.status === 'active').length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aktif kredi yok</p>
                  ) : (
                    <div className="space-y-3">
                      {credits.filter(c => c.status === 'active').slice(0, 4).map((credit) => (
                        <div key={credit.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{credit.bankName}</p>
                            <p className="text-sm text-gray-500">{credit.creditType}</p>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Kalan: €{(credit.remainingAmount || 0).toLocaleString('tr-TR')}</span>
                            <span className="text-gray-600">Taksit: €{(credit.monthlyPayment || 0).toLocaleString('tr-TR')}</span>
                          </div>
                          <Progress
                            value={((credit.paidAmount || 0) / (credit.amount || 1)) * 100}
                            className="mt-2 h-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Activity */}
            <div className="mt-6 bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  Bugunun Aktivitesi
                </h3>
              </div>
              <div className="p-4 grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <ArrowUpRight className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Girisler</p>
                  <p className="text-2xl font-bold text-green-600">
                    €{stats.todayIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <ArrowDownRight className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Cikislar</p>
                  <p className="text-2xl font-bold text-red-600">
                    €{stats.todayExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Net</p>
                  <p className={`text-2xl font-bold ${(stats.todayIncome - stats.todayExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{(stats.todayIncome - stats.todayExpense).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== KASA TAB ==================== */}
          <TabsContent value="cash">
            {/* Cash Status Card */}
            <div className="bg-white rounded-lg border mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${currentCashRegister ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Wallet className={`h-8 w-8 ${currentCashRegister ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Kasa Durumu</h3>
                      <p className="text-sm text-gray-500">
                        {currentCashRegister
                          ? `Acilis: ${new Date(currentCashRegister.openedAt || '').toLocaleString('tr-TR')}`
                          : 'Kasa kapali'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Guncel Bakiye</p>
                    <p className="text-3xl font-bold text-green-600">
                      €{stats.cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Actions */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Button
                className="h-24 flex-col gap-2"
                variant={currentCashRegister ? 'outline' : 'default'}
                onClick={() => setCashOpenDialogOpen(true)}
                disabled={!!currentCashRegister}
              >
                <Wallet className="h-6 w-6" />
                <span>Kasa Ac</span>
              </Button>

              <Button
                className="h-24 flex-col gap-2"
                variant="outline"
                onClick={() => setCashCloseDialogOpen(true)}
                disabled={!currentCashRegister}
              >
                <Settings className="h-6 w-6" />
                <span>Kasa Kapat</span>
              </Button>

              <Button
                className="h-24 flex-col gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setCashTransactionType('income');
                  setCashTransactionDialogOpen(true);
                }}
                disabled={!currentCashRegister}
              >
                <ArrowUpRight className="h-6 w-6" />
                <span>Kasaya Giris</span>
              </Button>

              <Button
                className="h-24 flex-col gap-2 bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setCashTransactionType('expense');
                  setCashTransactionDialogOpen(true);
                }}
                disabled={!currentCashRegister}
              >
                <ArrowDownRight className="h-6 w-6" />
                <span>Kasadan Cikis</span>
              </Button>
            </div>

            {/* Cash Transactions */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Son Kasa Islemleri</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Aciklama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(tx => tx.accountType === 'cash')
                    .slice(0, 10)
                    .map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.date || tx.createdAt?.split('T')[0]}</TableCell>
                        <TableCell><TransactionTypeBadge type={tx.type || ''} /></TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>{tx.category}</TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}€{(tx.amount || 0).toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  {transactions.filter(tx => tx.accountType === 'cash').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Kasa islemi bulunamadi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ==================== BANKA TAB ==================== */}
          <TabsContent value="bank">
            {/* Bank Summary */}
            <div className="bg-white rounded-lg border mb-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-full bg-blue-100">
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Toplam Banka Bakiyesi</h3>
                    <p className="text-sm text-gray-500">{bankAccounts.length} hesap</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  €{stats.bankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Bank Actions */}
            <div className="flex gap-4 mb-6">
              <Button onClick={() => {
                setSelectedBankAccount(null);
                setBankAccountDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Hesap
              </Button>
              <Button variant="outline" onClick={() => setBankTransactionDialogOpen(true)}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Havale / EFT
              </Button>
              <Button variant="outline" onClick={() => setBankAccountsListOpen(true)}>
                <List className="h-4 w-4 mr-2" />
                Tum Hesaplar
              </Button>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {bankAccounts.map((account) => (
                <div key={account.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{account.name}</h4>
                      <p className="text-sm text-gray-500">{account.bankName}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditBankAccount(account)}>
                          <Edit className="h-4 w-4 mr-2" /> Duzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteBankAccount(account)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 font-mono">{account.iban}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    €{(account.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
              {bankAccounts.length === 0 && (
                <div className="col-span-3 bg-white rounded-lg border p-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Henuz banka hesabi eklenmemis</p>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      setSelectedBankAccount(null);
                      setBankAccountDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ilk Hesabi Ekle
                  </Button>
                </div>
              )}
            </div>

            {/* Bank Transactions */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Son Banka Islemleri</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Hesap</TableHead>
                    <TableHead>Aciklama</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(tx => tx.accountType === 'bank')
                    .slice(0, 10)
                    .map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.date || tx.createdAt?.split('T')[0]}</TableCell>
                        <TableCell><TransactionTypeBadge type={tx.type || ''} /></TableCell>
                        <TableCell>{bankAccounts.find(a => a.id === tx.accountId)?.name || '-'}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}€{(tx.amount || 0).toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  {transactions.filter(tx => tx.accountType === 'bank').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Banka islemi bulunamadi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ==================== KREDILER TAB ==================== */}
          <TabsContent value="credits">
            {/* Credit Summary */}
            <div className="bg-white rounded-lg border mb-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-full bg-red-100">
                    <CreditCard className="h-8 w-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Toplam Kredi Borcu</h3>
                    <p className="text-sm text-gray-500">{stats.activeCredits} aktif kredi</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  €{stats.totalCreditDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Credit Actions & Filters */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-4">
                <Button onClick={() => {
                  setSelectedCredit(null);
                  setCreditDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Kredi
                </Button>
              </div>

              <Select value={creditStatusFilter} onValueChange={setCreditStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Krediler</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="completed">Tamamlandi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credits Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banka</TableHead>
                    <TableHead>Kredi Tipi</TableHead>
                    <TableHead>Toplam</TableHead>
                    <TableHead>Kalan</TableHead>
                    <TableHead>Taksit</TableHead>
                    <TableHead>Faiz</TableHead>
                    <TableHead>Ilerleme</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredits.map((credit) => {
                    const progress = ((credit.paidAmount || 0) / (credit.amount || 1)) * 100;
                    return (
                      <TableRow key={credit.id}>
                        <TableCell className="font-medium">{credit.bankName}</TableCell>
                        <TableCell>{credit.creditType}</TableCell>
                        <TableCell>€{(credit.amount || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          €{(credit.remainingAmount || 0).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell>€{(credit.monthlyPayment || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell>%{credit.interestRate}</TableCell>
                        <TableCell className="w-[120px]">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={credit.status || 'active'} /></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewCredit(credit)}>
                                <Eye className="h-4 w-4 mr-2" /> Detay
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePayCredit(credit)}>
                                <Receipt className="h-4 w-4 mr-2" /> Taksit Ode
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditCredit(credit)}>
                                <Edit className="h-4 w-4 mr-2" /> Duzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteCredit(credit)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCredits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {creditStatusFilter !== 'all' ? 'Bu durumda kredi yok' : 'Henuz kredi eklenmemis'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ==================== ISLEMLER TAB ==================== */}
          <TabsContent value="transactions">
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
                  <SelectItem value="deposit">Yatirma</SelectItem>
                  <SelectItem value="withdrawal">Cekme</SelectItem>
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

              <Button variant="outline" onClick={() => handleExport('transactions')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
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
                        <TableCell className={`text-right font-medium ${['income', 'deposit'].includes(tx.type || '') ? 'text-green-600' : 'text-red-600'}`}>
                          {['income', 'deposit'].includes(tx.type || '') ? '+' : '-'}
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

          {/* ==================== EXPORT TAB ==================== */}
          <TabsContent value="export">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Mali Musavir Export
              </h3>

              <div className="grid grid-cols-3 gap-6">
                {/* Transactions Export */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Receipt className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Islem Raporu</h4>
                      <p className="text-sm text-gray-500">Tum finansal islemler</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Input type="date" className="flex-1" />
                      <span>-</span>
                      <Input type="date" className="flex-1" />
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => handleExport('transactions')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel Indir
                  </Button>
                </div>

                {/* Bank Statements Export */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Banka Ekstresi</h4>
                      <p className="text-sm text-gray-500">Hesap hareketleri</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Hesap sec" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tum Hesaplar</SelectItem>
                        {bankAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => handleExport('bank')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel Indir
                  </Button>
                </div>

                {/* Credits Export */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="h-8 w-8 text-red-600" />
                    <div>
                      <h4 className="font-medium">Kredi Raporu</h4>
                      <p className="text-sm text-gray-500">Kredi ve taksit detaylari</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Kredi sec" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tum Krediler</SelectItem>
                        {credits.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.bankName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => handleExport('credits')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel Indir
                  </Button>
                </div>
              </div>

              {/* Full Export */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div>
                      <h4 className="font-medium">Tam Finansal Rapor</h4>
                      <p className="text-sm text-gray-500">
                        Kasa, banka, kredi - tum veriler tek dosyada
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => handleExport('full')}>
                    <Download className="h-4 w-4 mr-2" />
                    Tam Rapor Indir
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== DIALOGS ==================== */}

      {/* Bank Dialogs */}
      <BankAccountDialog
        open={bankAccountDialogOpen}
        onOpenChange={setBankAccountDialogOpen}
        account={selectedBankAccount}
      />

      <BankTransactionDialog
        open={bankTransactionDialogOpen}
        onOpenChange={setBankTransactionDialogOpen}
        accounts={bankAccounts}
      />

      <BankAccountsListDialog
        open={bankAccountsListOpen}
        onOpenChange={setBankAccountsListOpen}
        accounts={bankAccounts}
        onEdit={handleEditBankAccount}
        onDelete={handleDeleteBankAccount}
      />

      {/* Cash Dialogs */}
      <CashOpenDialog
        open={cashOpenDialogOpen}
        onOpenChange={setCashOpenDialogOpen}
      />

      <CashCloseDialog
        open={cashCloseDialogOpen}
        onOpenChange={setCashCloseDialogOpen}
        currentRegister={currentCashRegister || null}
      />

      <CashTransactionDialog
        open={cashTransactionDialogOpen}
        onOpenChange={setCashTransactionDialogOpen}
        type={cashTransactionType}
      />

      {/* Credit Dialogs */}
      <CreditDialog
        open={creditDialogOpen}
        onOpenChange={setCreditDialogOpen}
        credit={selectedCredit}
        bankAccounts={bankAccounts}
      />

      <CreditDetailDialog
        open={creditDetailDialogOpen}
        onOpenChange={setCreditDetailDialogOpen}
        credit={selectedCredit}
        payments={creditPayments.filter(p => p.creditId === selectedCredit?.id)}
      />

      <CreditPaymentDialog
        open={creditPaymentDialogOpen}
        onOpenChange={setCreditPaymentDialogOpen}
        credit={selectedCredit}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
