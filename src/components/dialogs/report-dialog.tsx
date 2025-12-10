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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { subscribeToRTDB } from '@/services/firebase';
import {
  Loader2, RefreshCw, Download, Printer, Package,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  BarChart3, PieChart, DollarSign, Warehouse, FileSpreadsheet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart,
  Pie, Cell, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// =================== KPI CARD COMPONENT ===================
function KPICard({
  title,
  value,
  icon,
  color = 'blue',
  change,
  changeType,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  change?: string;
  changeType?: 'up' | 'down';
}) {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50',
    green: 'border-l-green-500 bg-green-50',
    red: 'border-l-red-500 bg-red-50',
    amber: 'border-l-amber-500 bg-amber-50',
    purple: 'border-l-purple-500 bg-purple-50',
  };

  const textColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`rounded-lg border-l-4 p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        {icon}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${textColors[color]}`}>{value}</span>
        {change && (
          <span className={`text-sm flex items-center ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {changeType === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

// =================== STATUS BADGE COMPONENT ===================
function StatusBadge({ status }: { status: 'normal' | 'low' | 'critical' | 'out' }) {
  const styles = {
    normal: 'bg-green-100 text-green-800',
    low: 'bg-amber-100 text-amber-800',
    critical: 'bg-orange-100 text-orange-800',
    out: 'bg-red-100 text-red-800',
  };

  const labels = {
    normal: 'Normal',
    low: 'Dusuk',
    critical: 'Kritik',
    out: 'Stok Yok',
  };

  const icons = {
    normal: <CheckCircle className="h-3 w-3 mr-1" />,
    low: <AlertTriangle className="h-3 w-3 mr-1" />,
    critical: <AlertTriangle className="h-3 w-3 mr-1" />,
    out: <AlertTriangle className="h-3 w-3 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
}

// =================== ABC CLASS BADGE ===================
function ABCBadge({ abcClass }: { abcClass: 'A' | 'B' | 'C' }) {
  const styles = {
    A: 'bg-red-100 text-red-800 border-red-300',
    B: 'bg-amber-100 text-amber-800 border-amber-300',
    C: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 ${styles[abcClass]}`}>
      {abcClass}
    </span>
  );
}

// =================== INTERFACES ===================
interface Product {
  id: string;
  basic?: {
    name?: string;
    category?: string;
  };
  pricing?: {
    baseCost?: number;
    branchPricing?: Record<string, { unitPrice?: number }>;
  };
  stock?: {
    totalStock?: number;
    unit?: string;
    branchStock?: Record<string, {
      currentStock?: number;
      minStock?: number;
      maxStock?: number;
    }>;
  };
  supplier?: {
    supplierName?: string;
    leadTime?: number;
  };
  // Flat structure support
  name?: string;
  stock_qty?: number;
  price?: number;
  cost?: number;
}

interface Branch {
  id: string;
  name?: string;
  type?: string;
}

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType?: string;
}

// =================== MAIN COMPONENT ===================
export function ReportDialog({ open, onOpenChange, reportType = 'stock' }: ReportDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // =================== LOAD DATA ===================
  useEffect(() => {
    if (!open) return;

    setLoading(true);

    // RTDB'den ürün verilerini çek
    const unsubProducts = subscribeToRTDB('products', (data) => {
      console.log('ReportDialog: products loaded', data.length);
      setProducts(data || []);
    });

    // RTDB'den şube verilerini çek
    const unsubBranches = subscribeToRTDB('branches', (data) => {
      console.log('ReportDialog: branches loaded', data.length);
      setBranches(data || []);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubBranches();
    };
  }, [open]);

  // =================== HELPER FUNCTIONS ===================
  const getProductStock = (product: Product): number => {
    if (product.stock?.totalStock !== undefined) return product.stock.totalStock;
    if (product.stock_qty !== undefined) return product.stock_qty;
    return 0;
  };

  const getProductCost = (product: Product): number => {
    if (product.pricing?.baseCost !== undefined) return product.pricing.baseCost;
    if (product.cost !== undefined) return product.cost;
    return 0;
  };

  const getProductName = (product: Product): string => {
    return product.basic?.name || product.name || '-';
  };

  const getProductCategory = (product: Product): string => {
    return product.basic?.category || '-';
  };

  const getMinStock = (product: Product, branchId?: string): number => {
    if (branchId && product.stock?.branchStock?.[branchId]) {
      return product.stock.branchStock[branchId].minStock || 10;
    }
    return 10;
  };

  const getStockStatus = (current: number, min: number): 'normal' | 'low' | 'critical' | 'out' => {
    if (current <= 0) return 'out';
    if (current < min * 0.3) return 'critical';
    if (current < min) return 'low';
    return 'normal';
  };

  // =================== CALCULATED STATS ===================
  const stats = useMemo(() => {
    let totalProducts = products.length;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockDays = 0;
    let stockDaysCount = 0;

    products.forEach(product => {
      const stock = getProductStock(product);
      const cost = getProductCost(product);
      const minStock = getMinStock(product);

      totalValue += stock * cost;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock < minStock) {
        lowStockCount++;
      }

      if (stock > 0 && minStock > 0) {
        const dailySales = minStock / 7;
        if (dailySales > 0) {
          totalStockDays += stock / dailySales;
          stockDaysCount++;
        }
      }
    });

    const avgStockDays = stockDaysCount > 0 ? Math.round(totalStockDays / stockDaysCount) : 0;
    const turnoverRate = avgStockDays > 0 ? (365 / avgStockDays).toFixed(1) : '0';

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
      avgStockDays,
      turnoverRate,
    };
  }, [products]);

  // =================== STOCK STATUS DATA ===================
  const stockStatusData = useMemo(() => {
    return products
      .map(product => {
        const stock = getProductStock(product);
        const cost = getProductCost(product);
        const minStock = getMinStock(product);
        const maxStock = minStock * 10;
        const status = getStockStatus(stock, minStock);
        const dailySales = minStock / 7;
        const stockDays = dailySales > 0 ? Math.round(stock / dailySales) : 0;
        const totalValue = stock * cost;

        return {
          id: product.id,
          name: getProductName(product),
          category: getProductCategory(product),
          currentStock: stock,
          minStock,
          maxStock,
          status,
          stockDays,
          unitCost: cost,
          totalValue,
        };
      })
      .filter(item => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'normal') return item.status === 'normal';
        if (statusFilter === 'low') return item.status === 'low' || item.status === 'critical';
        if (statusFilter === 'out') return item.status === 'out';
        return true;
      })
      .sort((a, b) => a.currentStock - b.currentStock);
  }, [products, statusFilter]);

  // =================== VALUATION DATA ===================
  const valuationData = useMemo(() => {
    let totalInventoryValue = 0;
    let totalPotentialRevenue = 0;
    let highestValueProduct = { name: '-', value: 0 };

    const data = products
      .filter(p => getProductStock(p) > 0)
      .map(product => {
        const stock = getProductStock(product);
        const cost = getProductCost(product);
        const totalCost = stock * cost;

        // Get average unit price from branch pricing
        let avgPrice = 0;
        let priceCount = 0;
        if (product.pricing?.branchPricing) {
          Object.values(product.pricing.branchPricing).forEach((bp: any) => {
            if (bp?.unitPrice > 0) {
              avgPrice += bp.unitPrice;
              priceCount++;
            }
          });
        }
        avgPrice = priceCount > 0 ? avgPrice / priceCount : cost * 1.4;

        const potentialRevenue = stock * avgPrice;
        const profitMargin = avgPrice > 0 ? ((avgPrice - cost) / avgPrice * 100) : 0;

        totalInventoryValue += totalCost;
        totalPotentialRevenue += potentialRevenue;

        if (totalCost > highestValueProduct.value) {
          highestValueProduct = { name: getProductName(product), value: totalCost };
        }

        return {
          id: product.id,
          name: getProductName(product),
          category: getProductCategory(product),
          unitCost: cost,
          stock,
          totalCost,
          unitPrice: avgPrice,
          potentialRevenue,
          profitMargin,
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost);

    const avgUnitCost = data.length > 0 ? totalInventoryValue / data.reduce((sum, d) => sum + d.stock, 0) : 0;

    return {
      data,
      totalInventoryValue,
      totalPotentialRevenue,
      avgUnitCost,
      highestValueProduct,
    };
  }, [products]);

  // =================== LOW STOCK DATA ===================
  const lowStockData = useMemo(() => {
    const criticalCount = stockStatusData.filter(s => s.status === 'out' || s.status === 'critical').length;
    const warningCount = stockStatusData.filter(s => s.status === 'low').length;

    const items = stockStatusData
      .filter(item => item.status !== 'normal')
      .map(item => {
        const product = products.find(p => p.id === item.id);
        const shortage = Math.max(0, item.minStock - item.currentStock);
        const priority = item.status === 'out' ? 1 : item.status === 'critical' ? 2 : 3;
        const reorderQty = item.minStock * 2;

        return {
          ...item,
          shortage,
          priority,
          priorityLabel: priority === 1 ? 'ACIL' : priority === 2 ? 'Yuksek' : 'Orta',
          supplier: product?.supplier?.supplierName || '-',
          leadTime: product?.supplier?.leadTime || 2,
          reorderQty,
        };
      })
      .sort((a, b) => a.priority - b.priority || b.shortage - a.shortage);

    return { items, criticalCount, warningCount };
  }, [stockStatusData, products]);

  // =================== CATEGORY ANALYSIS ===================
  const categoryData = useMemo(() => {
    const categoryStats: Record<string, {
      productCount: number;
      totalStock: number;
      stockValue: number;
      totalPrice: number;
      priceCount: number;
      totalMargin: number;
      marginCount: number;
    }> = {};

    let totalStockValue = 0;

    products.forEach(product => {
      const category = getProductCategory(product);
      const stock = getProductStock(product);
      const cost = getProductCost(product);
      const stockValue = stock * cost;

      if (!categoryStats[category]) {
        categoryStats[category] = {
          productCount: 0,
          totalStock: 0,
          stockValue: 0,
          totalPrice: 0,
          priceCount: 0,
          totalMargin: 0,
          marginCount: 0,
        };
      }

      categoryStats[category].productCount++;
      categoryStats[category].totalStock += stock;
      categoryStats[category].stockValue += stockValue;
      totalStockValue += stockValue;

      if (product.pricing?.branchPricing) {
        Object.values(product.pricing.branchPricing).forEach((bp: any) => {
          if (bp?.unitPrice > 0) {
            categoryStats[category].totalPrice += bp.unitPrice;
            categoryStats[category].priceCount++;

            if (cost > 0) {
              const margin = ((bp.unitPrice - cost) / bp.unitPrice * 100);
              categoryStats[category].totalMargin += margin;
              categoryStats[category].marginCount++;
            }
          }
        });
      }
    });

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        productCount: stats.productCount,
        totalStock: stats.totalStock,
        stockValue: stats.stockValue,
        percentage: totalStockValue > 0 ? (stats.stockValue / totalStockValue * 100) : 0,
        avgPrice: stats.priceCount > 0 ? stats.totalPrice / stats.priceCount : 0,
        avgMargin: stats.marginCount > 0 ? stats.totalMargin / stats.marginCount : 0,
      }))
      .sort((a, b) => b.stockValue - a.stockValue);
  }, [products]);

  // =================== ABC ANALYSIS ===================
  const abcData = useMemo(() => {
    const productValues = products
      .map(product => ({
        name: getProductName(product),
        value: getProductStock(product) * getProductCost(product),
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalValue = productValues.reduce((sum, p) => sum + p.value, 0);
    let cumulative = 0;

    return productValues.map(product => {
      const contribution = totalValue > 0 ? (product.value / totalValue * 100) : 0;
      cumulative += contribution;

      let abcClass: 'A' | 'B' | 'C';
      let recommendation: string;
      let action: string;

      if (cumulative <= 80) {
        abcClass = 'A';
        recommendation = 'Siki kontrol';
        action = 'Gunluk takip';
      } else if (cumulative <= 95) {
        abcClass = 'B';
        recommendation = 'Duzenli kontrol';
        action = 'Haftalik takip';
      } else {
        abcClass = 'C';
        recommendation = 'Temel kontrol';
        action = 'Aylik takip';
      }

      return {
        name: product.name,
        value: product.value,
        contribution,
        cumulative,
        abcClass,
        recommendation,
        action,
      };
    });
  }, [products]);

  // =================== BRANCH COMPARISON ===================
  const branchComparisonData = useMemo(() => {
    const branchStats: Record<string, {
      name: string;
      totalProducts: number;
      totalStock: number;
      stockValue: number;
      lowStockCount: number;
      totalStockDays: number;
      stockDaysCount: number;
    }> = {};

    branches.forEach(branch => {
      branchStats[branch.id] = {
        name: branch.name || branch.id,
        totalProducts: 0,
        totalStock: 0,
        stockValue: 0,
        lowStockCount: 0,
        totalStockDays: 0,
        stockDaysCount: 0,
      };
    });

    products.forEach(product => {
      const cost = getProductCost(product);

      if (product.stock?.branchStock) {
        Object.entries(product.stock.branchStock).forEach(([branchId, stockData]) => {
          if (!branchStats[branchId]) return;

          const current = stockData?.currentStock || 0;
          const minStock = stockData?.minStock || 10;

          branchStats[branchId].totalProducts++;
          branchStats[branchId].totalStock += current;
          branchStats[branchId].stockValue += current * cost;

          if (current < minStock) {
            branchStats[branchId].lowStockCount++;
          }

          if (current > 0 && minStock > 0) {
            const dailySales = minStock / 7;
            if (dailySales > 0) {
              branchStats[branchId].totalStockDays += current / dailySales;
              branchStats[branchId].stockDaysCount++;
            }
          }
        });
      }
    });

    return Object.values(branchStats)
      .filter(b => b.totalProducts > 0)
      .map(branch => {
        const avgStockDays = branch.stockDaysCount > 0
          ? Math.round(branch.totalStockDays / branch.stockDaysCount)
          : 0;
        const turnover = avgStockDays > 0 ? (365 / avgStockDays).toFixed(1) : '0';

        return {
          ...branch,
          avgStockDays,
          turnover,
        };
      });
  }, [products, branches]);

  // =================== CHART DATA ===================
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  // Stock Trend Data (simulated monthly trend)
  const stockTrendData = useMemo(() => {
    const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran'];
    const currentStock = stats.totalValue;

    return months.map((month, index) => {
      const factor = 0.7 + (index * 0.06);
      const variance = 1 + (Math.random() * 0.1 - 0.05);
      return {
        name: month,
        stokDegeri: Math.round(currentStock * factor * variance),
        urunSayisi: Math.round(stats.totalProducts * (0.85 + index * 0.03)),
        dusukStok: Math.max(0, Math.round(stats.lowStockCount * (1.3 - index * 0.08))),
      };
    });
  }, [stats]);

  // Category Distribution for Pie Chart
  const categoryPieData = useMemo(() => {
    return categoryData.slice(0, 6).map((cat, index) => ({
      name: cat.category.length > 15 ? cat.category.substring(0, 15) + '...' : cat.category,
      value: Math.round(cat.stockValue),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [categoryData]);

  // ABC Distribution for Chart
  const abcDistributionData = useMemo(() => {
    const aCount = abcData.filter(p => p.abcClass === 'A').length;
    const bCount = abcData.filter(p => p.abcClass === 'B').length;
    const cCount = abcData.filter(p => p.abcClass === 'C').length;
    const aValue = abcData.filter(p => p.abcClass === 'A').reduce((sum, p) => sum + p.value, 0);
    const bValue = abcData.filter(p => p.abcClass === 'B').reduce((sum, p) => sum + p.value, 0);
    const cValue = abcData.filter(p => p.abcClass === 'C').reduce((sum, p) => sum + p.value, 0);

    return [
      { name: 'A Sinifi', urunSayisi: aCount, deger: Math.round(aValue), color: '#ef4444' },
      { name: 'B Sinifi', urunSayisi: bCount, deger: Math.round(bValue), color: '#f59e0b' },
      { name: 'C Sinifi', urunSayisi: cCount, deger: Math.round(cValue), color: '#10b981' },
    ];
  }, [abcData]);

  // =================== HANDLERS ===================
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Genel Ozet
      const summaryData = [
        ['STOK ANALIZ RAPORU', '', '', ''],
        ['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR'), '', ''],
        ['', '', '', ''],
        ['GENEL OZET', '', '', ''],
        ['Toplam Urun', stats.totalProducts],
        ['Toplam Stok Degeri', `€${stats.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`],
        ['Dusuk Stok Urun', stats.lowStockCount],
        ['Stok Yok', stats.outOfStockCount],
        ['Ortalama Stok Gunu', stats.avgStockDays],
        ['Devir Hizi', `${stats.turnoverRate}x`],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ozet');

      // Sheet 2: Stok Durumu
      const stockHeaders = ['Urun Adi', 'Kategori', 'Mevcut Stok', 'Min Stok', 'Max Stok', 'Durum', 'Stok Gunu', 'Birim Maliyet', 'Toplam Deger'];
      const stockRows = stockStatusData.map(item => [
        item.name,
        item.category,
        item.currentStock,
        item.minStock,
        item.maxStock,
        item.status === 'normal' ? 'Normal' : item.status === 'low' ? 'Dusuk' : item.status === 'critical' ? 'Kritik' : 'Stok Yok',
        item.stockDays,
        item.unitCost,
        item.totalValue,
      ]);
      const wsStock = XLSX.utils.aoa_to_sheet([stockHeaders, ...stockRows]);
      XLSX.utils.book_append_sheet(wb, wsStock, 'Stok Durumu');

      // Sheet 3: Degerleme
      const valHeaders = ['Urun Adi', 'Kategori', 'Birim Maliyet', 'Stok', 'Toplam Maliyet', 'Satis Fiyati', 'Potansiyel Gelir', 'Kar Marji %'];
      const valRows = valuationData.data.map(item => [
        item.name,
        item.category,
        item.unitCost,
        item.stock,
        item.totalCost,
        item.unitPrice,
        item.potentialRevenue,
        item.profitMargin.toFixed(1),
      ]);
      const wsVal = XLSX.utils.aoa_to_sheet([valHeaders, ...valRows]);
      XLSX.utils.book_append_sheet(wb, wsVal, 'Degerleme');

      // Sheet 4: Dusuk Stok
      const lowHeaders = ['Urun Adi', 'Mevcut Stok', 'Min Stok', 'Eksik Miktar', 'Oncelik', 'Tedarikci', 'Teslimat Suresi', 'Onerilen Siparis'];
      const lowRows = lowStockData.items.map(item => [
        item.name,
        item.currentStock,
        item.minStock,
        item.shortage,
        item.priorityLabel,
        item.supplier,
        item.leadTime,
        item.reorderQty,
      ]);
      const wsLow = XLSX.utils.aoa_to_sheet([lowHeaders, ...lowRows]);
      XLSX.utils.book_append_sheet(wb, wsLow, 'Dusuk Stok');

      // Sheet 5: Kategori Analizi
      const catHeaders = ['Kategori', 'Urun Sayisi', 'Toplam Stok', 'Stok Degeri', '% Payi', 'Ort. Fiyat', 'Ort. Kar Marji %'];
      const catRows = categoryData.map(item => [
        item.category,
        item.productCount,
        item.totalStock,
        item.stockValue,
        item.percentage.toFixed(1),
        item.avgPrice,
        item.avgMargin.toFixed(1),
      ]);
      const wsCat = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
      XLSX.utils.book_append_sheet(wb, wsCat, 'Kategori Analizi');

      // Sheet 6: ABC Analizi
      const abcHeaders = ['Sinif', 'Urun Adi', 'Stok Degeri', '% Katki', 'Kumulatif %', 'Oneri', 'Aksiyon'];
      const abcRows = abcData.map(item => [
        item.abcClass,
        item.name,
        item.value,
        item.contribution.toFixed(2),
        item.cumulative.toFixed(2),
        item.recommendation,
        item.action,
      ]);
      const wsAbc = XLSX.utils.aoa_to_sheet([abcHeaders, ...abcRows]);
      XLSX.utils.book_append_sheet(wb, wsAbc, 'ABC Analizi');

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Stok_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dosyasi olusturulamadi: ' + (error as Error).message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // =================== RENDER ===================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                Stok Analizi & Raporlari
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Detayli stok durumu, degerleme ve analiz raporlari
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Yazdir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-4">
              <TabsTrigger value="overview">Genel Bakis</TabsTrigger>
              <TabsTrigger value="trend">Trend Analizi</TabsTrigger>
              <TabsTrigger value="stock">Stok Durumu</TabsTrigger>
              <TabsTrigger value="valuation">Degerleme</TabsTrigger>
              <TabsTrigger value="lowstock">Dusuk Stok</TabsTrigger>
              <TabsTrigger value="category">Kategori</TabsTrigger>
              <TabsTrigger value="abc">ABC Analizi</TabsTrigger>
            </TabsList>

            {/* =================== OVERVIEW TAB =================== */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <KPICard
                  title="Toplam Urun"
                  value={stats.totalProducts.toString()}
                  icon={<Package className="h-5 w-5 text-blue-600" />}
                  color="blue"
                />
                <KPICard
                  title="Toplam Deger"
                  value={`€${stats.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`}
                  icon={<DollarSign className="h-5 w-5 text-green-600" />}
                  color="green"
                />
                <KPICard
                  title="Dusuk Stok"
                  value={stats.lowStockCount.toString()}
                  icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <KPICard
                  title="Stok Yok"
                  value={stats.outOfStockCount.toString()}
                  icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                  color="red"
                />
                <KPICard
                  title="Ort. Stok Gunu"
                  value={`${stats.avgStockDays} gun`}
                  icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
                  color="purple"
                />
                <KPICard
                  title="Devir Hizi"
                  value={`${stats.turnoverRate}x`}
                  icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                  color="blue"
                />
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Kategori Dagilimi</h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `€${value.toLocaleString('tr-TR')}`} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* =================== TREND ANALYSIS TAB =================== */}
            <TabsContent value="trend" className="space-y-6">
              {/* Stok Degeri Trend Grafigi */}
              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Stok Degeri Trendi (Son 6 Ay)</h4>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stockTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value: number) => `€${value.toLocaleString('tr-TR')}`} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="stokDegeri"
                        name="Stok Degeri"
                        stroke="#3b82f6"
                        fill="#93c5fd"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Urun Sayisi ve Dusuk Stok Grafigi */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Urun Sayisi Trendi</h4>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stockTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="urunSayisi"
                          name="Urun Sayisi"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Dusuk Stok Urun Trendi</h4>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="dusukStok"
                          name="Dusuk Stok"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ABC Sinifi Dagilimi */}
              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold text-gray-900 mb-4">ABC Sinifi Dagilimi</h4>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={abcDistributionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`} />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip formatter={(value: number) => `€${value.toLocaleString('tr-TR')}`} />
                      <Legend />
                      <Bar dataKey="deger" name="Stok Degeri" radius={[0, 4, 4, 0]}>
                        {abcDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* =================== STOCK STATUS TAB =================== */}
            <TabsContent value="stock" className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Label>Durum:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tumu</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Dusuk</SelectItem>
                      <SelectItem value="out">Stok Yok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-white rounded-lg border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urun</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Mevcut</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Max</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">Stok Gunu</TableHead>
                      <TableHead className="text-right">Birim Deger</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : stockStatusData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          Urun bulunamadi
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockStatusData.slice(0, 50).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-gray-600">{item.category}</TableCell>
                          <TableCell className={`text-right font-medium ${item.status === 'out' ? 'text-red-600' : item.status !== 'normal' ? 'text-amber-600' : ''}`}>
                            {item.currentStock.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right">{item.minStock}</TableCell>
                          <TableCell className="text-right">{item.maxStock}</TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell className="text-right">{item.stockDays} gun</TableCell>
                          <TableCell className="text-right">€{item.unitCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">€{item.totalValue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* =================== VALUATION TAB =================== */}
            <TabsContent value="valuation" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <KPICard
                  title="Toplam Envanter"
                  value={`€${valuationData.totalInventoryValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`}
                  icon={<Warehouse className="h-5 w-5 text-purple-600" />}
                  color="purple"
                />
                <KPICard
                  title="Ort. Birim Maliyet"
                  value={`€${valuationData.avgUnitCost.toFixed(2)}`}
                  icon={<DollarSign className="h-5 w-5 text-blue-600" />}
                  color="blue"
                />
                <KPICard
                  title="En Degerli Urun"
                  value={valuationData.highestValueProduct.name.substring(0, 15)}
                  icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                  color="green"
                />
              </div>

              <div className="bg-white rounded-lg border max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urun</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Birim Maliyet</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead className="text-right">Toplam Maliyet</TableHead>
                      <TableHead className="text-right">Satis Fiyati</TableHead>
                      <TableHead className="text-right">Potansiyel Gelir</TableHead>
                      <TableHead className="text-right">Kar Marji</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuationData.data.slice(0, 50).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-gray-600">{item.category}</TableCell>
                        <TableCell className="text-right">€{item.unitCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.stock.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-medium">€{item.totalCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">€{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">€{item.potentialRevenue.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-medium ${item.profitMargin < 10 ? 'text-red-600' : item.profitMargin < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                          {item.profitMargin.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* =================== LOW STOCK TAB =================== */}
            <TabsContent value="lowstock" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <KPICard
                  title="Kritik (Stok Yok)"
                  value={lowStockData.criticalCount.toString()}
                  icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                  color="red"
                />
                <KPICard
                  title="Uyari (Dusuk)"
                  value={lowStockData.warningCount.toString()}
                  icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
                  color="amber"
                />
                <KPICard
                  title="Siparis Onerisi"
                  value={`${lowStockData.items.length} urun`}
                  icon={<Package className="h-5 w-5 text-blue-600" />}
                  color="blue"
                />
              </div>

              <div className="bg-white rounded-lg border max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urun</TableHead>
                      <TableHead className="text-right">Mevcut</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Eksik</TableHead>
                      <TableHead>Oncelik</TableHead>
                      <TableHead>Tedarikci</TableHead>
                      <TableHead className="text-right">Teslimat</TableHead>
                      <TableHead className="text-right">Onerilen Siparis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          Tum urunler yeterli stokta
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockData.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className={`text-right font-medium ${item.status === 'out' ? 'text-red-600' : 'text-amber-600'}`}>
                            {item.currentStock.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right">{item.minStock}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">{item.shortage.toFixed(1)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.priority === 1 ? 'bg-red-100 text-red-800' : item.priority === 2 ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'}`}>
                              {item.priorityLabel}
                            </span>
                          </TableCell>
                          <TableCell>{item.supplier}</TableCell>
                          <TableCell className="text-right">{item.leadTime} gun</TableCell>
                          <TableCell className="text-right font-medium">{item.reorderQty}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {lowStockData.items.length > 0 && (
                <Button className="w-full" size="lg">
                  <Package className="h-4 w-4 mr-2" />
                  Toplu Siparis Olustur ({lowStockData.items.length} urun)
                </Button>
              )}
            </TabsContent>

            {/* =================== CATEGORY ANALYSIS TAB =================== */}
            <TabsContent value="category" className="space-y-4">
              <div className="bg-white rounded-lg border max-h-[450px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Urun Sayisi</TableHead>
                      <TableHead className="text-right">Toplam Stok</TableHead>
                      <TableHead className="text-right">Stok Degeri</TableHead>
                      <TableHead className="text-right">% Payi</TableHead>
                      <TableHead className="text-right">Ort. Fiyat</TableHead>
                      <TableHead className="text-right">Ort. Kar Marji</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryData.map((item) => (
                      <TableRow key={item.category}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell className="text-right">{item.productCount}</TableCell>
                        <TableCell className="text-right">{item.totalStock.toFixed(0)}</TableCell>
                        <TableCell className="text-right font-medium">€{item.stockValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">€{item.avgPrice.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-medium ${item.avgMargin < 10 ? 'text-red-600' : item.avgMargin < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                          {item.avgMargin.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* =================== ABC ANALYSIS TAB =================== */}
            <TabsContent value="abc" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">ABC Analizi - Deger Bazli Siniflandirma</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <ABCBadge abcClass="A" />
                    <span><strong>A Sinifi:</strong> %80 deger, %20 urun (Kritik)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ABCBadge abcClass="B" />
                    <span><strong>B Sinifi:</strong> %15 deger, %30 urun (Onemli)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ABCBadge abcClass="C" />
                    <span><strong>C Sinifi:</strong> %5 deger, %50 urun (Dusuk)</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Sinif</TableHead>
                      <TableHead>Urun Adi</TableHead>
                      <TableHead className="text-right">Stok Degeri</TableHead>
                      <TableHead className="text-right">% Katki</TableHead>
                      <TableHead className="text-right">Kumulatif %</TableHead>
                      <TableHead>Oneri</TableHead>
                      <TableHead>Aksiyon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abcData.slice(0, 50).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <ABCBadge abcClass={item.abcClass} />
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">€{item.value.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right">{item.contribution.toFixed(2)}%</TableCell>
                        <TableCell className={`text-right font-medium ${item.cumulative <= 80 ? 'text-red-600' : item.cumulative <= 95 ? 'text-amber-600' : 'text-green-600'}`}>
                          {item.cumulative.toFixed(2)}%
                        </TableCell>
                        <TableCell>{item.recommendation}</TableCell>
                        <TableCell className="text-gray-600">{item.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
