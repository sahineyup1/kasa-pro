'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Car,
  Fuel,
  Wrench,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Package,
  DollarSign,
  Clock,
  ShoppingCart,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCachedFirestoreCollection, getCachedDataArray } from '@/services/firebase';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

// Chart colors
const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface DashboardStats {
  // Expenses
  expenseCount: number;
  expenseTotal: number;
  // Vehicles
  vehicleCount: number;
  fuelTotal: number;
  maintenanceTotal: number;
  // Invoices
  purchaseInvoiceCount: number;
  purchaseInvoiceTotal: number;
  saleInvoiceCount: number;
  saleInvoiceTotal: number;
  unpaidInvoices: number;
  // Employees
  employeeCount: number;
  activeEmployees: number;
  totalSalary: number;
  // Products
  productCount: number;
  lowStockProducts: number;
  // Partners
  partnerCount: number;
}

interface MonthlyData {
  name: string;
  purchases: number;
  sales: number;
  expenses: number;
}

interface CategoryData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  amount: number;
  date: string;
  icon: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Senaide rolu icin ozel basit dashboard
  if (user?.role === 'senaide') {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-[#EAE8E3] min-h-screen">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900">Hos Geldiniz</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {user.fullName} - {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Hizli Erisim Kartlari */}
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/purchase-invoices">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-blue-100 mb-4">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Alis Faturasi</h3>
                <p className="text-sm text-gray-500 mt-1">Yeni fatura girisi</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/expenses">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-orange-100 mb-4">
                  <Receipt className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Masraflar</h3>
                <p className="text-sm text-gray-500 mt-1">Masraf girisi</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/products">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-emerald-100 mb-4">
                  <Package className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Urunler</h3>
                <p className="text-sm text-gray-500 mt-1">Urun listesi</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/settings">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-gray-100 mb-4">
                  <Settings className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Ayarlar</h3>
                <p className="text-sm text-gray-500 mt-1">Kisisel ayarlar</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Bilgilendirme */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <p className="text-sm">Yukaridaki menuleri kullanarak islemlerinizi yapabilirsiniz.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ana veriler için loading state yok - hemen göster, veriler geldikçe güncellensin
  const [stats, setStats] = useState<DashboardStats>({
    expenseCount: 0,
    expenseTotal: 0,
    vehicleCount: 0,
    fuelTotal: 0,
    maintenanceTotal: 0,
    purchaseInvoiceCount: 0,
    purchaseInvoiceTotal: 0,
    saleInvoiceCount: 0,
    saleInvoiceTotal: 0,
    unpaidInvoices: 0,
    employeeCount: 0,
    activeEmployees: 0,
    totalSalary: 0,
    productCount: 0,
    lowStockProducts: 0,
    partnerCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [expiryWarnings, setExpiryWarnings] = useState<{ plate: string; type: string; date: string }[]>([]);
  const [visaWarnings, setVisaWarnings] = useState<{ name: string; date: string; daysLeft: number }[]>([]);

  // Hangi veriler yüklendi?
  const [loadedSections, setLoadedSections] = useState({
    expenses: false,
    sales: false,
    purchases: false,
    employees: false,
  });

  // Verileri bir kez yükle (ONE-TIME FETCH - Firebase maliyetini %80 düşürür)
  useEffect(() => {
    const loadDashboardData = async () => {
      // Get current month names for charts
      const getMonthNames = () => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(d.toLocaleDateString('tr-TR', { month: 'short' }));
        }
        return months;
      };

      const monthNames = getMonthNames();
      const initMonthlyData = monthNames.map((name) => ({
        name,
        purchases: 0,
        sales: 0,
        expenses: 0,
      }));

      try {
        // Paralel olarak tüm verileri çek (5 dakika cache)
        const [expenses, vehicles, fuel, maintenance, purchases, saleInvoices, employees, products] = await Promise.all([
          getCachedFirestoreCollection('expenses'),
          getCachedDataArray('vehicles'),
          getCachedDataArray('vehicle_fuel'),
          getCachedDataArray('vehicle_maintenance'),
          getCachedFirestoreCollection('purchases'),
          getCachedFirestoreCollection('sale_invoices'),
          getCachedDataArray('employees'),
          getCachedDataArray('products'),
        ]);

        const now = new Date();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        // Masraflar
        if (expenses.length > 0) {
          const expenseTotal = expenses.reduce((sum: number, e: any) => sum + (e.totalAmount || e.grossAmount || e.amount || 0), 0);

          // Kategori dağılımı
          const categoryMap: Record<string, number> = {};
          expenses.forEach((e: any) => {
            const cat = e.category || e.categoryName || 'Diger';
            categoryMap[cat] = (categoryMap[cat] || 0) + (e.totalAmount || e.grossAmount || e.amount || 0);
          });
          const catData = Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
          setExpenseCategories(catData);

          // Son aktiviteler
          const sorted = [...expenses].sort(
            (a: any, b: any) => new Date(b.date || b.documentDate || b.createdAt).getTime() - new Date(a.date || a.documentDate || a.createdAt).getTime()
          );
          const activities = sorted.slice(0, 5).map((e: any) => ({
            id: e.id,
            type: 'expense',
            title: e.vendor || e.vendorName || 'Masraf',
            amount: e.totalAmount || e.grossAmount || e.amount || 0,
            date: e.date || e.documentDate,
            icon: 'receipt',
          }));
          setRecentActivities(activities);

          // Aylık masraf
          expenses.forEach((e: any) => {
            const expDate = new Date(e.date || e.documentDate || e.createdAt);
            const monthDiff = (now.getFullYear() - expDate.getFullYear()) * 12 + now.getMonth() - expDate.getMonth();
            if (monthDiff >= 0 && monthDiff < 6) {
              initMonthlyData[5 - monthDiff].expenses += e.totalAmount || e.grossAmount || e.amount || 0;
            }
          });

          setStats(prev => ({ ...prev, expenseCount: expenses.length, expenseTotal }));
        }
        setLoadedSections(prev => ({ ...prev, expenses: true }));

        // Araçlar
        if (vehicles.length > 0) {
          const warnings: { plate: string; type: string; date: string }[] = [];
          vehicles.forEach((v: any) => {
            if (v.insuranceExpiry) {
              const expiry = new Date(v.insuranceExpiry);
              if (expiry.getTime() - now.getTime() < thirtyDays && expiry.getTime() > now.getTime()) {
                warnings.push({ plate: v.plate, type: 'Sigorta', date: v.insuranceExpiry });
              }
            }
            if (v.kaskoExpiry) {
              const expiry = new Date(v.kaskoExpiry);
              if (expiry.getTime() - now.getTime() < thirtyDays && expiry.getTime() > now.getTime()) {
                warnings.push({ plate: v.plate, type: 'Kasko', date: v.kaskoExpiry });
              }
            }
          });
          setExpiryWarnings(warnings);
          setStats(prev => ({ ...prev, vehicleCount: vehicles.length }));
        }

        // Yakıt
        const fuelTotal = fuel.reduce((sum, f: any) => sum + (f.totalAmount || 0), 0);
        setStats(prev => ({ ...prev, fuelTotal }));

        // Bakım
        const maintenanceTotal = maintenance.reduce((sum, m: any) => sum + (m.cost || 0), 0);
        setStats(prev => ({ ...prev, maintenanceTotal }));

        // Alış faturaları
        if (purchases.length > 0) {
          const activeList = purchases.filter((i: any) => i.status !== 'cancelled');
          const purchaseTotal = activeList.reduce((sum: number, i: any) => sum + (i.total || i.grand_total || i.grandTotal || i.totalAmount || 0), 0);
          const unpaid = activeList.filter((i: any) => i.paymentStatus === 'unpaid' || i.paymentStatus === 'odenmedi').length;

          activeList.forEach((inv: any) => {
            const invDate = new Date(inv.date || inv.invoiceDate || inv.createdAt);
            const monthDiff = (now.getFullYear() - invDate.getFullYear()) * 12 + now.getMonth() - invDate.getMonth();
            if (monthDiff >= 0 && monthDiff < 6) {
              initMonthlyData[5 - monthDiff].purchases += inv.total || inv.grand_total || inv.grandTotal || inv.totalAmount || 0;
            }
          });

          setStats(prev => ({ ...prev, purchaseInvoiceCount: activeList.length, purchaseInvoiceTotal: purchaseTotal, unpaidInvoices: unpaid }));
        }
        setLoadedSections(prev => ({ ...prev, purchases: true }));

        // Satış faturaları
        if (saleInvoices.length > 0) {
          const activeList = saleInvoices.filter((i: any) => i.status !== 'cancelled');
          const saleTotal = activeList.reduce((sum: number, i: any) => sum + (i.total || i.grand_total || i.grandTotal || i.totalAmount || 0), 0);

          activeList.forEach((inv: any) => {
            const invDate = new Date(inv.date || inv.invoiceDate || inv.createdAt);
            const monthDiff = (now.getFullYear() - invDate.getFullYear()) * 12 + now.getMonth() - invDate.getMonth();
            if (monthDiff >= 0 && monthDiff < 6) {
              initMonthlyData[5 - monthDiff].sales += inv.total || inv.grand_total || inv.grandTotal || inv.totalAmount || 0;
            }
          });

          setStats(prev => ({ ...prev, saleInvoiceCount: activeList.length, saleInvoiceTotal: saleTotal }));
        }
        setLoadedSections(prev => ({ ...prev, sales: true }));
        setMonthlyData([...initMonthlyData]);

        // Personel
        if (employees.length > 0) {
          const activeList = employees.filter((e: any) => e.status === 'active' || e.status === 'aktif');
          const totalSalary = activeList.reduce((sum, e: any) => sum + (e.salary_info?.monthly_salary || e.salary || 0), 0);

          const visaWarns: { name: string; date: string; daysLeft: number }[] = [];
          employees.forEach((e: any) => {
            const visaDate = e.visa_info?.visa_expiry_date || e.visaExpiry;
            if (visaDate && visaDate !== '9999-12-31') {
              const expiry = new Date(visaDate);
              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft > 0 && daysLeft <= 30) {
                const name = e.personal_info?.full_name || `${e.firstName || ''} ${e.lastName || ''}`.trim();
                visaWarns.push({ name, date: visaDate, daysLeft });
              }
            }
          });
          setVisaWarnings(visaWarns.sort((a, b) => a.daysLeft - b.daysLeft));
          setStats(prev => ({ ...prev, employeeCount: employees.length, activeEmployees: activeList.length, totalSalary }));
        }
        setLoadedSections(prev => ({ ...prev, employees: true }));

        // Ürünler
        if (products.length > 0) {
          const lowStock = products.filter((p: any) => (p.stock?.totalStock || p.stock_qty || 0) < (p.minStock || 10)).length;
          setStats(prev => ({ ...prev, productCount: products.length, lowStockProducts: lowStock }));
        }

      } catch (error) {
        console.error('Dashboard data load error:', error);
        // Hata durumunda da loaded olarak işaretle
        setLoadedSections({ expenses: true, sales: true, purchases: true, employees: true });
      }
    };

    loadDashboardData();
  }, []);

  // Calculate profit/loss
  const profitLoss = useMemo(() => {
    return stats.saleInvoiceTotal - stats.purchaseInvoiceTotal - stats.expenseTotal;
  }, [stats]);

  // Skeleton component for loading states
  const CardSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-[#EAE8E3] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hos geldiniz! {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
          {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Warnings Section */}
      {(expiryWarnings.length > 0 || visaWarnings.length > 0) && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          {expiryWarnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3 sm:pt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-medium text-amber-800 text-sm sm:text-base">Arac Belge Uyarilari</h4>
                    <ul className="mt-1 text-xs sm:text-sm text-amber-700 space-y-1">
                      {expiryWarnings.slice(0, 3).map((w, i) => (
                        <li key={i} className="truncate">
                          <span className="font-medium">{w.plate}</span> - {w.type}: {formatDate(w.date)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {visaWarnings.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3 sm:pt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-medium text-red-800 text-sm sm:text-base">Vize Uyarilari</h4>
                    <ul className="mt-1 text-xs sm:text-sm text-red-700 space-y-1">
                      {visaWarnings.slice(0, 3).map((w, i) => (
                        <li key={i} className="truncate">
                          <span className="font-medium">{w.name}</span> - {w.daysLeft} gun kaldi
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Stats Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        {/* Satış */}
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Satis</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {!loadedSections.sales ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-base sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats.saleInvoiceTotal)}</div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{stats.saleInvoiceCount} fatura</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Masraflar */}
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Masraflar</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-orange-100">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {!loadedSections.expenses ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-base sm:text-2xl font-bold text-orange-600">{formatCurrency(stats.expenseTotal)}</div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{stats.expenseCount} kayit</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Kar/Zarar */}
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Kar/Zarar</CardTitle>
            <div className={`p-1.5 sm:p-2 rounded-lg ${profitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {profitLoss >= 0 ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {!(loadedSections.sales && loadedSections.expenses && loadedSections.purchases) ? (
              <CardSkeleton />
            ) : (
              <>
                <div className={`text-base sm:text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(profitLoss))}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{profitLoss >= 0 ? 'Net kar' : 'Net zarar'}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg">Aylik Trend</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Son 6 ayin alis/satis karsilastirmasi</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#374151', fontSize: 12 }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Satis"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#colorSales)"
                  />
                  <Area
                    type="monotone"
                    dataKey="purchases"
                    name="Alis"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="url(#colorPurchases)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories Pie Chart */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg">Masraf Dagilimi</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Kategoriye gore masraf analizi</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="h-[200px] sm:h-[300px]">
              {expenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${(name || '').substring(0, 8)} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Masraf verisi yok
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Personel */}
        <Card className="bg-white shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-500">Personel</CardTitle>
            <div className="p-1 sm:p-2 rounded-lg bg-indigo-100">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-sm sm:text-xl font-bold">{stats.activeEmployees}</div>
            <p className="text-[9px] sm:text-xs text-gray-500 truncate">
              {formatCurrency(stats.totalSalary)}
            </p>
          </CardContent>
        </Card>

        {/* Araçlar */}
        <Card className="bg-white shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-500">Araclar</CardTitle>
            <div className="p-1 sm:p-2 rounded-lg bg-cyan-100">
              <Car className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-sm sm:text-xl font-bold">{stats.vehicleCount}</div>
            <p className="text-[9px] sm:text-xs text-gray-500 truncate">
              {formatCurrency(stats.fuelTotal)}
            </p>
          </CardContent>
        </Card>

        {/* Yakıt */}
        <Card className="bg-white shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-500">Yakit</CardTitle>
            <div className="p-1 sm:p-2 rounded-lg bg-amber-100">
              <Fuel className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-sm sm:text-xl font-bold truncate">{formatCurrency(stats.fuelTotal)}</div>
            <p className="text-[9px] sm:text-xs text-gray-500">Toplam</p>
          </CardContent>
        </Card>

        {/* Bakım */}
        <Card className="bg-white shadow-md hidden sm:block">
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-500">Bakim</CardTitle>
            <div className="p-1 sm:p-2 rounded-lg bg-purple-100">
              <Wrench className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-sm sm:text-xl font-bold truncate">{formatCurrency(stats.maintenanceTotal)}</div>
            <p className="text-[9px] sm:text-xs text-gray-500">Toplam</p>
          </CardContent>
        </Card>

        {/* Ürünler */}
        <Card className="bg-white shadow-md hidden sm:block">
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-500">Urunler</CardTitle>
            <div className="p-1 sm:p-2 rounded-lg bg-pink-100">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600" />
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-sm sm:text-xl font-bold">{stats.productCount}</div>
            {stats.lowStockProducts > 0 ? (
              <p className="text-[9px] sm:text-xs text-red-500">{stats.lowStockProducts} dusuk</p>
            ) : (
              <p className="text-[9px] sm:text-xs text-gray-500">Stok</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Quick Summary */}
        <Card className="bg-white shadow-lg lg:col-span-2">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg">Hizli Ozet</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Finansal durum tablosu</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-4">
              <div className="flex items-center justify-between p-2 sm:p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700 text-xs sm:text-base">Toplam Satis</span>
                </div>
                <span className="font-bold text-emerald-600 text-xs sm:text-base">{formatCurrency(stats.saleInvoiceTotal)}</span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <span className="font-medium text-orange-700 text-xs sm:text-base">Toplam Masraf</span>
                </div>
                <span className="font-bold text-orange-600 text-xs sm:text-base">-{formatCurrency(stats.expenseTotal)}</span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                  <span className="font-medium text-indigo-700 text-xs sm:text-base">Personel Maas</span>
                </div>
                <span className="font-bold text-indigo-600 text-xs sm:text-base">-{formatCurrency(stats.totalSalary)}</span>
              </div>

              <div className="border-t pt-2 sm:pt-4">
                <div className={`flex items-center justify-between p-2 sm:p-4 rounded-lg ${profitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <DollarSign className={`h-4 w-4 sm:h-6 sm:w-6 ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`font-bold text-sm sm:text-lg ${profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {profitLoss >= 0 ? 'NET KAR' : 'NET ZARAR'}
                    </span>
                  </div>
                  <span className={`font-bold text-base sm:text-2xl ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(profitLoss))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg">Son Islemler</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Son aktiviteler</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-400 text-center py-4">Henuz islem yok</p>
              ) : (
                recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 hover:bg-gray-50 rounded-lg">
                    <div className="p-1.5 sm:p-2 rounded-full bg-gray-100 flex-shrink-0">
                      <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{formatDate(activity.date)}</p>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 flex-shrink-0">
                      {formatCurrency(activity.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
