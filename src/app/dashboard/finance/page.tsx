'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { subscribeToFirestore, deleteFirestoreData, subscribeToRTDB, subscribeToBranches } from '@/services/firebase';
import { toast } from 'sonner';
import {
  Plus, RefreshCw, MoreHorizontal, Search, Download, FileSpreadsheet,
  Wallet, Building2, CreditCard, TrendingUp, TrendingDown, DollarSign,
  ArrowUpRight, ArrowDownRight, Eye, Edit, Trash2, Calculator,
  ChevronRight, PiggyBank, Landmark, Receipt, FileText, AlertCircle,
  CheckCircle, Clock, Settings, List, FileDown, Store, MapPin, Lock, Unlock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

// Branch (Şube) with Treasury
interface Branch {
  id: string;
  name?: string;
  isActive?: boolean;
  treasury?: {
    cashRegister?: {
      balance?: {
        openingBalance?: number;
        currentBalance?: number;
        expectedBalance?: number;
        lastUpdate?: string;
      };
      audit?: {
        status?: 'open' | 'closed';
        openedAt?: string;
        closedAt?: string;
        openedBy?: string;
        closedBy?: string;
        difference?: number;
      };
    };
    bankAccounts?: Record<string, BranchBankAccount>;
  };
}

interface BranchBankAccount {
  id?: string;
  bankName?: string;
  accountName?: string;
  accountType?: 'checking' | 'savings' | 'foreign' | 'business' | 'credit_line' | 'leasing';
  iban?: string;
  accountNumber?: string;
  currency?: string;
  isActive?: boolean;
  balance?: {
    currentBalance?: number;
    openingBalance?: number;
    lastUpdated?: string;
  };
  creditLimit?: number;
  usedAmount?: number;
  availableCredit?: number;
  leasingAsset?: string;
  leasingTotal?: number;
  leasingRemaining?: number;
}

// Transaction type badge
function TransactionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    'income': 'bg-green-100 text-green-800',
    'expense': 'bg-red-100 text-red-800',
    'transfer': 'bg-amber-100 text-amber-800',
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
    'completed': 'bg-amber-100 text-amber-800',
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);

  // Branch filter - separate for Kasa and Banka
  const [selectedKasaBranch, setSelectedKasaBranch] = useState<string>('');
  const [selectedBankaBranch, setSelectedBankaBranch] = useState<string>('');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [creditStatusFilter, setCreditStatusFilter] = useState('all');

  // Export date filters
  const [exportStartDate, setExportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [exportEndDate, setExportEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

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

    // Credits - try multiple sources for desktop app compatibility
    // Firestore: credits, krediler | RTDB: credits, krediler
    let firestoreCredits: Credit[] = [];
    let firestoreKrediler: Credit[] = [];
    let rtdbCredits: Credit[] = [];

    const mapCreditFields = (k: any): Credit => ({
      ...k,
      id: k.id || k._id,
      bankName: k.bankName || k.bankaAdi || k.banka || '',
      creditType: k.creditType || k.krediTuru || k.tur || '',
      amount: Number(k.amount || k.tutar || k.miktar || 0),
      interestRate: Number(k.interestRate || k.faizOrani || k.faiz || 0),
      term: Number(k.term || k.vade || k.sure || 0),
      monthlyPayment: Number(k.monthlyPayment || k.aylikTaksit || k.taksit || 0),
      startDate: k.startDate || k.baslangicTarihi || k.baslangic || '',
      endDate: k.endDate || k.bitisTarihi || k.bitis || '',
      paidAmount: Number(k.paidAmount || k.odenenTutar || k.odenen || 0),
      remainingAmount: Number(k.remainingAmount || k.kalanTutar || k.kalan || k.amount || k.tutar || 0),
      status: k.status || k.durum || 'active',
    });

    const updateCredits = () => {
      // Merge and deduplicate by id
      const allCredits = [...firestoreCredits, ...firestoreKrediler, ...rtdbCredits];
      const uniqueCredits = allCredits.reduce((acc: Credit[], curr) => {
        if (!acc.find(c => c.id === curr.id)) acc.push(curr);
        return acc;
      }, []);
      setCredits(uniqueCredits);
    };

    const unsubCredits = subscribeToFirestore('credits', (data) => {
      firestoreCredits = (data || []).map(mapCreditFields);
      updateCredits();
    });

    const unsubKrediler = subscribeToFirestore('krediler', (data) => {
      firestoreKrediler = (data || []).map(mapCreditFields);
      updateCredits();
    });

    // Also try RTDB
    const unsubRTDBCredits = subscribeToRTDB('krediler', (data) => {
      rtdbCredits = (data || []).map(mapCreditFields);
      updateCredits();
    });

    const unsubCreditPayments = subscribeToFirestore('creditPayments', (data) => {
      setCreditPayments(data || []);
    });

    // Branches (Şubeler) - company/branches path'inden
    setBranchesLoading(true);
    const unsubBranches = subscribeToBranches((data) => {
      setBranches(data || []);
      setBranchesLoading(false);
    });

    return () => {
      unsubTransactions();
      unsubBankAccounts();
      unsubCashRegisters();
      unsubCredits();
      unsubKrediler();
      unsubRTDBCredits();
      unsubCreditPayments();
      unsubBranches();
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

  // Branch stats
  const branchStats = useMemo(() => {
    const activeBranches = branches.filter(b => b.isActive !== false);
    const openCashRegisters = branches.filter(b =>
      b.treasury?.cashRegister?.audit?.status === 'open'
    ).length;

    const totalBranchCash = branches.reduce((sum, b) => {
      return sum + (b.treasury?.cashRegister?.balance?.currentBalance || 0);
    }, 0);

    const totalBranchBankBalance = branches.reduce((sum, b) => {
      // Banka hesaplari
      if (b.treasury?.bankAccounts) {
        const branchBankTotal = Object.values(b.treasury.bankAccounts).reduce((bankSum: number, acc: any) => {
          return bankSum + (acc.balance?.currentBalance || 0);
        }, 0);
        return sum + branchBankTotal;
      }
      return sum;
    }, 0);

    return {
      totalBranches: branches.length,
      activeBranches: activeBranches.length,
      openCashRegisters,
      closedCashRegisters: activeBranches.length - openCashRegisters,
      totalBranchCash,
      totalBranchBankBalance,
    };
  }, [branches]);

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

  // Delete transaction
  const handleDeleteTransaction = async (tx: Transaction) => {
    if (!confirm('Bu islemi silmek istediginize emin misiniz?')) return;
    try {
      await deleteFirestoreData('transactions', tx.id);
      toast.success('Islem silindi');
    } catch (error) {
      toast.error('Islem silinemedi: ' + (error as Error).message);
    }
  };

  // Mali Musavir - Tam Export (Tek dosyada tum veriler)
  const handleMaliMusavirExport = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Filter transactions by date
      const filteredTx = transactions.filter(tx => {
        const txDate = tx.date || tx.createdAt?.split('T')[0] || '';
        return txDate >= exportStartDate && txDate <= exportEndDate;
      });

      // 1. Ozet Sayfasi
      const summaryData = [
        ['MALI MUSAVIR RAPORU'],
        ['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')],
        ['Donem:', `${exportStartDate} - ${exportEndDate}`],
        [''],
        ['HAZINE OZETI'],
        ['Kasa Bakiyesi:', `€${stats.cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        ['Banka Bakiyesi:', `€${stats.bankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        ['Toplam Varlik:', `€${stats.totalAssets.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        ['Kredi Borcu:', `€${stats.totalCreditDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        ['Net Deger:', `€${stats.netWorth.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        [''],
        ['DONEM OZETI'],
        ['Toplam Giris:', `€${filteredTx.filter(t => ['income', 'deposit'].includes(t.type || '')).reduce((s, t) => s + (t.amount || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        ['Toplam Cikis:', `€${filteredTx.filter(t => ['expense', 'withdrawal'].includes(t.type || '')).reduce((s, t) => s + (t.amount || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        ['Islem Sayisi:', filteredTx.length],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ozet');

      // 2. Tum Islemler
      const txHeaders = ['Tarih', 'Tip', 'Kategori', 'Aciklama', 'Hesap', 'Tutar', 'Referans'];
      const txData = filteredTx.map(tx => [
        tx.date || tx.createdAt?.split('T')[0] || '',
        tx.type === 'income' ? 'Giris' : tx.type === 'expense' ? 'Cikis' : tx.type === 'deposit' ? 'Yatirma' : tx.type === 'withdrawal' ? 'Cekme' : tx.type || '',
        tx.category || '',
        tx.description || '',
        tx.accountType === 'cash' ? 'Kasa' : tx.accountType === 'bank' ? 'Banka' : tx.accountType || '',
        tx.amount || 0,
        tx.reference || ''
      ]);
      const txSheet = XLSX.utils.aoa_to_sheet([txHeaders, ...txData]);
      XLSX.utils.book_append_sheet(workbook, txSheet, 'Islemler');

      // 3. Banka Hesaplari
      const bankHeaders = ['Hesap Adi', 'Banka', 'IBAN', 'Sube', 'Para Birimi', 'Bakiye', 'Durum'];
      const bankData = bankAccounts.map(acc => [
        acc.name || '',
        acc.bankName || '',
        acc.iban || '',
        acc.branch || '',
        acc.currency || 'EUR',
        acc.balance || 0,
        acc.isActive !== false ? 'Aktif' : 'Pasif'
      ]);
      const bankSheet = XLSX.utils.aoa_to_sheet([bankHeaders, ...bankData]);
      XLSX.utils.book_append_sheet(workbook, bankSheet, 'Banka Hesaplari');

      // 4. Krediler
      const creditHeaders = ['Banka', 'Kredi Turu', 'Toplam', 'Odenen', 'Kalan', 'Faiz %', 'Taksit', 'Vade (Ay)', 'Baslangic', 'Bitis', 'Durum'];
      const creditData = credits.map(c => [
        c.bankName || '',
        c.creditType || '',
        c.amount || 0,
        c.paidAmount || 0,
        c.remainingAmount || 0,
        c.interestRate || 0,
        c.monthlyPayment || 0,
        c.term || 0,
        c.startDate || '',
        c.endDate || '',
        c.status === 'active' ? 'Aktif' : c.status === 'completed' ? 'Tamamlandi' : c.status || ''
      ]);
      const creditSheet = XLSX.utils.aoa_to_sheet([creditHeaders, ...creditData]);
      XLSX.utils.book_append_sheet(workbook, creditSheet, 'Krediler');

      // 5. Kredi Odemeleri
      const paymentHeaders = ['Kredi', 'Taksit No', 'Vade', 'Odeme Tarihi', 'Tutar', 'Anapara', 'Faiz', 'Durum'];
      const paymentData = creditPayments.map(p => {
        const credit = credits.find(c => c.id === p.creditId);
        return [
          credit?.bankName || '',
          p.paymentNumber || '',
          p.dueDate || '',
          p.paidDate || '',
          p.amount || 0,
          p.principal || 0,
          p.interest || 0,
          p.status === 'paid' ? 'Odendi' : p.status === 'pending' ? 'Bekliyor' : p.status || ''
        ];
      });
      const paymentSheet = XLSX.utils.aoa_to_sheet([paymentHeaders, ...paymentData]);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Kredi Odemeleri');

      // 6. Kasa Kayitlari
      const cashHeaders = ['Tarih', 'Acilis', 'Kapanis', 'Beklenen', 'Fark', 'Durum', 'Acan', 'Kapatan'];
      const cashData = cashRegisters.map(r => [
        r.date || r.openedAt?.split('T')[0] || '',
        r.openingBalance || 0,
        r.closingBalance || 0,
        r.expectedBalance || 0,
        (r.closingBalance || 0) - (r.expectedBalance || 0),
        r.status === 'open' ? 'Acik' : 'Kapali',
        r.openedBy || '',
        r.closedBy || ''
      ]);
      const cashSheet = XLSX.utils.aoa_to_sheet([cashHeaders, ...cashData]);
      XLSX.utils.book_append_sheet(workbook, cashSheet, 'Kasa Kayitlari');

      // Export
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Mali_Musavir_Raporu_${exportStartDate}_${exportEndDate}.xlsx`);

      toast.success('Mali Musavir raporu indirildi!');
    } catch (error) {
      toast.error('Export hatasi: ' + (error as Error).message);
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
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="dashboard">
              <TrendingUp className="h-4 w-4 mr-2" />
              Hazine Ozeti
            </TabsTrigger>
            <TabsTrigger value="branches">
              <Store className="h-4 w-4 mr-2" />
              Sube Kasalari
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

              <div className="bg-white rounded-lg border-l-4 border-l-amber-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Banka</p>
                    <p className="text-xl font-semibold text-amber-600">
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
                    <Building2 className="h-5 w-5 text-amber-600" />
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
                          <p className="font-semibold text-amber-600">
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
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Net</p>
                  <p className={`text-2xl font-bold ${(stats.todayIncome - stats.todayExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{(stats.todayIncome - stats.todayExpense).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== ŞUBE KASALARI TAB ==================== */}
          <TabsContent value="branches">
            {/* Branch Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border-l-4 border-l-purple-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Store className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Sube</p>
                    <p className="text-xl font-semibold">{branchStats.activeBranches}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-green-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Unlock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Acik Kasalar</p>
                    <p className="text-xl font-semibold text-green-600">{branchStats.openCashRegisters}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-orange-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Kasa</p>
                    <p className="text-xl font-semibold text-orange-600">
                      €{branchStats.totalBranchCash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-l-4 border-l-amber-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Banka</p>
                    <p className="text-xl font-semibold text-amber-600">
                      €{branchStats.totalBranchBankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Branches List */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Sube Kasa Durumlari
                </h3>
              </div>

              {branchesLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Subeler yukleniyor...
                </div>
              ) : branches.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Store className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p>Henuz sube bulunamadi</p>
                  <p className="text-sm mt-2">Desktop uygulamasinda subeler tanimlanmalidir</p>
                </div>
              ) : (
                <div className="divide-y">
                  {branches.filter(b => b.isActive !== false).map((branch) => {
                    const cashRegister = branch.treasury?.cashRegister;
                    const isOpen = cashRegister?.audit?.status === 'open';
                    const cashBalance = cashRegister?.balance?.currentBalance || 0;

                    // Banka hesaplari
                    const bankAccountsObj = branch.treasury?.bankAccounts || {};
                    const bankAccountsArray = Object.entries(bankAccountsObj).map(([id, acc]) => ({
                      id,
                      ...acc
                    }));

                    const totalBankBalance = bankAccountsArray.reduce(
                      (sum, acc) => sum + (acc.balance?.currentBalance || 0),
                      0
                    );

                    return (
                      <div key={branch.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isOpen ? 'bg-green-100' : 'bg-gray-100'}`}>
                              {isOpen ? (
                                <Unlock className="h-5 w-5 text-green-600" />
                              ) : (
                                <Lock className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{branch.name || branch.id}</h4>
                              <p className="text-xs text-gray-500">
                                {isOpen ? (
                                  <>
                                    Acik - {cashRegister?.audit?.openedAt
                                      ? new Date(cashRegister.audit.openedAt).toLocaleString('tr-TR')
                                      : '-'}
                                  </>
                                ) : (
                                  'Kapali'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            {/* Kasa Bakiyesi */}
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Kasa</p>
                              <p className={`text-lg font-semibold ${cashBalance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                €{cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>

                            {/* Banka Bakiyesi */}
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Banka ({bankAccountsArray.length})</p>
                              <p className={`text-lg font-semibold ${totalBankBalance > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                                €{totalBankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>

                            {/* Toplam */}
                            <div className="text-right border-l pl-4">
                              <p className="text-xs text-gray-500">Toplam</p>
                              <p className="text-lg font-bold">
                                €{(cashBalance + totalBankBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Bank Accounts Details */}
                        {bankAccountsArray.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-2">Banka Hesaplari:</p>
                            <div className="grid grid-cols-4 gap-2">
                              {bankAccountsArray.map((acc) => {
                                const isCredit = acc.accountType === 'credit_line' || acc.accountType === 'leasing';
                                const balance = acc.balance?.currentBalance || 0;

                                return (
                                  <div
                                    key={acc.id}
                                    className={`p-2 rounded-lg text-sm ${
                                      isCredit ? 'bg-red-50' : 'bg-amber-50'
                                    }`}
                                  >
                                    <p className="font-medium truncate">{acc.accountName || acc.bankName}</p>
                                    <p className="text-xs text-gray-500">{acc.bankName}</p>
                                    <p className={`font-semibold ${
                                      isCredit
                                        ? 'text-red-600'
                                        : balance >= 0
                                          ? 'text-amber-600'
                                          : 'text-red-600'
                                    }`}>
                                      {acc.currency || 'EUR'} {balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </p>
                                    {isCredit && acc.creditLimit && (
                                      <p className="text-xs text-gray-500">
                                        Limit: {acc.currency || 'EUR'} {(acc.creditLimit || 0).toLocaleString()}
                                      </p>
                                    )}
                                    {acc.accountType === 'leasing' && acc.leasingAsset && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {acc.leasingAsset}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ==================== KASA TAB ==================== */}
          <TabsContent value="cash">
            {/* Branch Selector */}
            <div className="bg-white rounded-lg border mb-6 p-4">
              <div className="flex items-center gap-4">
                <Label className="font-semibold">Sube Sec:</Label>
                <Select value={selectedKasaBranch} onValueChange={setSelectedKasaBranch}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Sube secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.filter(b => b.id && b.isActive !== false).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          {branch.name}
                          {branch.treasury?.cashRegister?.audit?.status === 'open' && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Acik</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Branch Cash Info */}
            {selectedKasaBranch ? (() => {
              const branch = branches.find(b => b.id === selectedKasaBranch);
              if (!branch) return null;
              const cashReg = branch.treasury?.cashRegister;
              const isOpen = cashReg?.audit?.status === 'open';
              const balance = cashReg?.balance?.currentBalance || 0;

              return (
                <>
                  {/* Cash Status Card */}
                  <div className="bg-white rounded-lg border mb-6">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-full ${isOpen ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Wallet className={`h-8 w-8 ${isOpen ? 'text-green-600' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{branch.name} - Kasa</h3>
                            <p className="text-sm text-gray-500">
                              {isOpen
                                ? `Acilis: ${cashReg?.audit?.openedAt ? new Date(cashReg.audit.openedAt).toLocaleString('tr-TR') : '-'}`
                                : 'Kasa kapali'}
                            </p>
                            {isOpen && cashReg?.audit?.openedBy && (
                              <p className="text-xs text-gray-400">Acan: {cashReg.audit.openedBy}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-500">Guncel Bakiye</p>
                          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            €{balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                          {cashReg?.balance?.openingBalance !== undefined && (
                            <p className="text-xs text-gray-400">
                              Acilis: €{(cashReg.balance.openingBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance Details */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg border p-4">
                      <p className="text-sm text-gray-500">Acilis Bakiyesi</p>
                      <p className="text-xl font-semibold">
                        €{(cashReg?.balance?.openingBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border p-4">
                      <p className="text-sm text-gray-500">Beklenen Bakiye</p>
                      <p className="text-xl font-semibold">
                        €{(cashReg?.balance?.expectedBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border p-4">
                      <p className="text-sm text-gray-500">Fark</p>
                      <p className={`text-xl font-semibold ${((cashReg?.balance?.currentBalance || 0) - (cashReg?.balance?.expectedBalance || 0)) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        €{((cashReg?.balance?.currentBalance || 0) - (cashReg?.balance?.expectedBalance || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Last Update */}
                  {cashReg?.balance?.lastUpdate && (
                    <div className="text-sm text-gray-500 mb-4">
                      Son guncelleme: {new Date(cashReg.balance.lastUpdate).toLocaleString('tr-TR')}
                    </div>
                  )}
                </>
              );
            })() : (
              <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                <Store className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Kasa bilgilerini gormek icin bir sube secin</p>
              </div>
            )}

            {/* Cash Transactions - only show if branch selected */}
            {selectedKasaBranch && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Kasa Islemleri - {branches.find(b => b.id === selectedKasaBranch)?.name}</h3>
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
                      .filter(tx => tx.accountType === 'cash' && tx.branch === selectedKasaBranch)
                      .slice(0, 20)
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
                    {transactions.filter(tx => tx.accountType === 'cash' && tx.branch === selectedKasaBranch).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Bu subeye ait kasa islemi bulunamadi
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ==================== BANKA TAB ==================== */}
          <TabsContent value="bank">
            {/* Branch Selector */}
            <div className="bg-white rounded-lg border mb-6 p-4">
              <div className="flex items-center gap-4">
                <Label className="font-semibold">Sube Sec:</Label>
                <Select value={selectedBankaBranch} onValueChange={setSelectedBankaBranch}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Sube secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.filter(b => b.id && b.isActive !== false).map((branch) => {
                      const bankAccs = branch.treasury?.bankAccounts;
                      const accountCount = bankAccs ? Object.keys(bankAccs).length : 0;
                      return (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            {branch.name}
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                              {accountCount} hesap
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Branch Bank Info */}
            {selectedBankaBranch ? (() => {
              const branch = branches.find(b => b.id === selectedBankaBranch);
              if (!branch) return null;

              // Banka hesaplari
              const bankAccountsObj = branch.treasury?.bankAccounts || {};
              const branchBankAccounts = Object.entries(bankAccountsObj).map(([id, acc]) => ({
                id,
                ...acc
              }));

              const totalBalance = branchBankAccounts.reduce(
                (sum, acc) => sum + (acc.balance?.currentBalance || 0),
                0
              );

              return (
                <>
                  {/* Bank Summary Card */}
                  <div className="bg-white rounded-lg border mb-6 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-4 rounded-full bg-amber-100">
                          <Building2 className="h-8 w-8 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{branch.name} - Banka Hesaplari</h3>
                          <p className="text-sm text-gray-500">{branchBankAccounts.length} hesap</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Toplam Bakiye</p>
                        <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          €{totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bank Accounts Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {branchBankAccounts.map((account) => {
                      const isCredit = account.accountType === 'credit_line' || account.accountType === 'leasing';
                      const balance = account.balance?.currentBalance || 0;

                      return (
                        <div key={account.id} className={`bg-white rounded-lg border p-4 ${isCredit ? 'border-red-200' : ''}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{account.accountName || account.bankName}</h4>
                              <p className="text-sm text-gray-500">{account.bankName}</p>
                              {account.accountType && (
                                <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                                  isCredit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {account.accountType === 'checking' ? 'Vadesiz' :
                                   account.accountType === 'savings' ? 'Vadeli' :
                                   account.accountType === 'foreign' ? 'Doviz' :
                                   account.accountType === 'business' ? 'Ticari' :
                                   account.accountType === 'credit_line' ? 'Kredi' :
                                   account.accountType === 'leasing' ? 'Leasing' : account.accountType}
                                </span>
                              )}
                            </div>
                          </div>

                          {account.iban && (
                            <p className="text-xs text-gray-400 mb-2 font-mono">{account.iban}</p>
                          )}

                          <p className={`text-2xl font-bold ${
                            isCredit ? 'text-red-600' : balance >= 0 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {account.currency || 'EUR'} {balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>

                          {/* Credit/Leasing specific info */}
                          {isCredit && account.creditLimit && (
                            <div className="mt-2 text-sm">
                              <p className="text-gray-500">Limit: {account.currency || 'EUR'} {(account.creditLimit || 0).toLocaleString()}</p>
                              <p className="text-gray-500">Kullanilan: {account.currency || 'EUR'} {(account.usedAmount || 0).toLocaleString()}</p>
                            </div>
                          )}
                          {account.accountType === 'leasing' && account.leasingAsset && (
                            <p className="mt-2 text-sm text-gray-500">{account.leasingAsset}</p>
                          )}

                          {/* Last update */}
                          {account.balance?.lastUpdated && (
                            <p className="mt-2 text-xs text-gray-400">
                              Son: {new Date(account.balance.lastUpdated).toLocaleDateString('tr-TR')}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {branchBankAccounts.length === 0 && (
                      <div className="col-span-2 bg-white rounded-lg border p-8 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">Bu subede banka hesabi bulunamadi</p>
                      </div>
                    )}
                  </div>

                  {/* Bank Transactions for this branch */}
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Banka Islemleri - {branch.name}</h3>
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
                          .filter(tx => tx.accountType === 'bank' && tx.branch === selectedBankaBranch)
                          .slice(0, 20)
                          .map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell>{tx.date || tx.createdAt?.split('T')[0]}</TableCell>
                              <TableCell><TransactionTypeBadge type={tx.type || ''} /></TableCell>
                              <TableCell>{branchBankAccounts.find(a => a.id === tx.accountId)?.accountName || branchBankAccounts.find(a => a.id === tx.accountId)?.bankName || tx.accountId || '-'}</TableCell>
                              <TableCell>{tx.description}</TableCell>
                              <TableCell className={`text-right font-medium ${tx.type === 'deposit' || tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'deposit' || tx.type === 'income' ? '+' : '-'}€{(tx.amount || 0).toLocaleString('tr-TR')}
                              </TableCell>
                            </TableRow>
                          ))}
                        {transactions.filter(tx => tx.accountType === 'bank' && tx.branch === selectedBankaBranch).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              Bu subeye ait banka islemi bulunamadi
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              );
            })() : (
              <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Banka bilgilerini gormek icin bir sube secin</p>
              </div>
            )}
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

              <Button variant="outline" onClick={handleMaliMusavirExport}>
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
                              <DropdownMenuItem onClick={() => {
                                toast.info(`Tarih: ${tx.date || tx.createdAt?.split('T')[0]}\nTip: ${tx.type}\nTutar: €${tx.amount}\nAciklama: ${tx.description || '-'}\nKategori: ${tx.category || '-'}\nReferans: ${tx.reference || '-'}`);
                              }}>
                                <Eye className="h-4 w-4 mr-2" /> Detaylar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteTransaction(tx)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Sil
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
          </TabsContent>

          {/* ==================== EXPORT TAB ==================== */}
          <TabsContent value="export">
            <div className="bg-white rounded-lg border p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Mali Musavir Raporu</h2>
                <p className="text-gray-500 mt-2">Tum finansal verilerinizi tek bir Excel dosyasinda indirin</p>
              </div>

              {/* Date Selection */}
              <div className="max-w-xl mx-auto mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rapor Donemi</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Baslangic</label>
                    <Input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <span className="text-gray-400 mt-5">—</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Bitis</label>
                    <Input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* What's Included */}
              <div className="max-w-2xl mx-auto mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Rapor Icerigi (6 Sayfa)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Ozet - Hazine durumu ve donem ozeti</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Islemler - Tum finansal hareketler</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Banka Hesaplari - Hesap detaylari</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Krediler - Kredi bilgileri</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Kredi Odemeleri - Taksit detaylari</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Kasa Kayitlari - Acilis/kapanis</span>
                  </div>
                </div>
              </div>

              {/* Current Summary */}
              <div className="max-w-2xl mx-auto mb-8 p-4 bg-amber-50 rounded-lg">
                <h3 className="text-sm font-medium text-amber-900 mb-3">Mevcut Veriler</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{transactions.length}</p>
                    <p className="text-xs text-amber-700">Islem</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{bankAccounts.length}</p>
                    <p className="text-xs text-amber-700">Banka Hesabi</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{credits.length}</p>
                    <p className="text-xs text-amber-700">Kredi</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{cashRegisters.length}</p>
                    <p className="text-xs text-amber-700">Kasa Kaydi</p>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="text-center">
                <Button
                  size="lg"
                  className="px-12 py-6 text-lg bg-green-600 hover:bg-green-700"
                  onClick={handleMaliMusavirExport}
                >
                  <FileDown className="h-6 w-6 mr-3" />
                  Mali Musavir Raporunu Indir
                </Button>
                <p className="text-xs text-gray-400 mt-3">
                  Excel formatinda (.xlsx) indirilecektir
                </p>
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
