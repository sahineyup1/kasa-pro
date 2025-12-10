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
import { subscribeToFirestore } from '@/services/firebase';
import {
  RefreshCw, Download, Calendar,
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  Package, Users, Truck, Receipt, Wallet, Building2, Eye
} from 'lucide-react';
import { ReportDialog } from '@/components/dialogs/report-dialog';
import { EmployeeReportDialog } from '@/components/dialogs/employee-report-dialog';

// Report card component
function ReportCard({
  title,
  description,
  icon,
  color,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Eye className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
}: {
  title: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        {icon}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
        {change && (
          <span className={`text-sm flex items-center ${
            changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {changeType === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
            {changeType === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialog states
  const [stockReportOpen, setStockReportOpen] = useState(false);
  const [employeeReportOpen, setEmployeeReportOpen] = useState(false);

  // Stats data
  const [salesData, setSalesData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    setLoading(true);

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    setStartDate(monthStart);
    setEndDate(today.toISOString().split('T')[0]);

    const unsubSales = subscribeToFirestore('sale_invoices', (data) => {
      setSalesData(data || []);
    });

    const unsubExpenses = subscribeToFirestore('expenses', (data) => {
      setExpensesData(data || []);
    });

    const unsubProducts = subscribeToFirestore('products', (data) => {
      setProductsData(data || []);
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubExpenses();
      unsubProducts();
    };
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSales = salesData.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalExpenses = expensesData.reduce((sum, e) => sum + (e.grossAmount || e.amount || 0), 0);
    const profit = totalSales - totalExpenses;
    const productCount = productsData.length;
    const lowStock = productsData.filter(p => {
      const stock = p.stock?.totalStock || p.stock_qty || 0;
      return stock < 10 && stock >= 0;
    }).length;

    return { totalSales, totalExpenses, profit, productCount, lowStock };
  }, [salesData, expensesData, productsData]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleGenerateReport = (reportType: string) => {
    // Open appropriate dialog based on report type
    if (reportType === 'Stok Durumu' || reportType === 'Stok Hareketleri' || reportType === 'Kritik Stok') {
      setStockReportOpen(true);
    } else if (reportType === 'Personel') {
      setEmployeeReportOpen(true);
    } else {
      alert(`${reportType} raporu hazirlaniyor...`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Raporlar</h1>
            <p className="text-sm text-gray-500 mt-1">
              Isletme analizleri ve performans raporlari
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

        {/* Date Range Selector */}
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Donem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Bugun</SelectItem>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="quarter">Bu Ceyrek</SelectItem>
              <SelectItem value="year">Bu Yil</SelectItem>
              <SelectItem value="custom">Ozel Tarih</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <span className="text-gray-400">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Quick Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hizli Bakis</h2>
          <div className="grid grid-cols-5 gap-4">
            <StatCard
              title="Toplam Satis"
              value={`€${stats.totalSales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              change="+12%"
              changeType="up"
              icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            />
            <StatCard
              title="Toplam Gider"
              value={`€${stats.totalExpenses.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              change="+5%"
              changeType="down"
              icon={<TrendingDown className="h-5 w-5 text-red-600" />}
            />
            <StatCard
              title="Net Kar"
              value={`€${stats.profit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              change={stats.profit >= 0 ? '+8%' : '-8%'}
              changeType={stats.profit >= 0 ? 'up' : 'down'}
              icon={<DollarSign className="h-5 w-5 text-purple-600" />}
            />
            <StatCard
              title="Urun Sayisi"
              value={stats.productCount.toString()}
              icon={<Package className="h-5 w-5 text-blue-600" />}
            />
            <StatCard
              title="Dusuk Stok"
              value={stats.lowStock.toString()}
              changeType={stats.lowStock > 0 ? 'down' : 'neutral'}
              icon={<Package className="h-5 w-5 text-amber-600" />}
            />
          </div>
        </div>

        {/* Report Categories */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Satis Raporlari</h2>
          <div className="grid grid-cols-3 gap-4">
            <ReportCard
              title="Gunluk Satis Raporu"
              description="Gunluk satis detaylari ve ozeti"
              icon={<Receipt className="h-6 w-6 text-green-600" />}
              color="bg-green-100"
              onClick={() => handleGenerateReport('Gunluk Satis')}
            />
            <ReportCard
              title="Aylik Satis Raporu"
              description="Aylik satis analizi ve karsilastirma"
              icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
              color="bg-blue-100"
              onClick={() => handleGenerateReport('Aylik Satis')}
            />
            <ReportCard
              title="Urun Bazli Satis"
              description="En cok satan urunler ve kategoriler"
              icon={<Package className="h-6 w-6 text-purple-600" />}
              color="bg-purple-100"
              onClick={() => handleGenerateReport('Urun Bazli Satis')}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Finans Raporlari</h2>
          <div className="grid grid-cols-3 gap-4">
            <ReportCard
              title="Kasa Raporu"
              description="Kasa hareketleri ve bakiye durumu"
              icon={<Wallet className="h-6 w-6 text-green-600" />}
              color="bg-green-100"
              onClick={() => handleGenerateReport('Kasa')}
            />
            <ReportCard
              title="Banka Raporu"
              description="Banka hareketleri ve mutabakat"
              icon={<Building2 className="h-6 w-6 text-blue-600" />}
              color="bg-blue-100"
              onClick={() => handleGenerateReport('Banka')}
            />
            <ReportCard
              title="Gider Raporu"
              description="Kategorilere gore gider analizi"
              icon={<TrendingDown className="h-6 w-6 text-red-600" />}
              color="bg-red-100"
              onClick={() => handleGenerateReport('Gider')}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stok Raporlari</h2>
          <div className="grid grid-cols-3 gap-4">
            <ReportCard
              title="Stok Durumu"
              description="Mevcut stok seviyeleri ve degerler"
              icon={<Package className="h-6 w-6 text-blue-600" />}
              color="bg-blue-100"
              onClick={() => handleGenerateReport('Stok Durumu')}
            />
            <ReportCard
              title="Stok Hareketleri"
              description="Stok giris/cikis gecmisi"
              icon={<BarChart3 className="h-6 w-6 text-purple-600" />}
              color="bg-purple-100"
              onClick={() => handleGenerateReport('Stok Hareketleri')}
            />
            <ReportCard
              title="Kritik Stok"
              description="Minimum seviye altindaki urunler"
              icon={<Package className="h-6 w-6 text-amber-600" />}
              color="bg-amber-100"
              onClick={() => handleGenerateReport('Kritik Stok')}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Diger Raporlar</h2>
          <div className="grid grid-cols-3 gap-4">
            <ReportCard
              title="Musteri Raporu"
              description="Musteri bazli satis analizi"
              icon={<Users className="h-6 w-6 text-indigo-600" />}
              color="bg-indigo-100"
              onClick={() => handleGenerateReport('Musteri')}
            />
            <ReportCard
              title="Tedarikci Raporu"
              description="Tedarikci bazli alis analizi"
              icon={<Truck className="h-6 w-6 text-teal-600" />}
              color="bg-teal-100"
              onClick={() => handleGenerateReport('Tedarikci')}
            />
            <ReportCard
              title="Personel Raporu"
              description="Personel performans ve maas raporu"
              icon={<Users className="h-6 w-6 text-pink-600" />}
              color="bg-pink-100"
              onClick={() => handleGenerateReport('Personel')}
            />
          </div>
        </div>
      </div>

      {/* Report Dialogs */}
      <ReportDialog
        open={stockReportOpen}
        onOpenChange={setStockReportOpen}
        reportType="stock"
      />

      <EmployeeReportDialog
        open={employeeReportOpen}
        onOpenChange={setEmployeeReportOpen}
      />
    </div>
  );
}
