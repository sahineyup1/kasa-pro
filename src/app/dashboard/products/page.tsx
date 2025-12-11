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
import { subscribeToRTDB, updateData, removeData } from '@/services/firebase';
import { ProductDialog } from '@/components/dialogs/product-dialog';
import { ProductCardDialog } from '@/components/dialogs/product-card-dialog';
import { ReportDialog } from '@/components/dialogs/report-dialog';
import {
  Plus, RefreshCw, MoreHorizontal, Pencil, Trash2, Eye, Search,
  Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  TrendingUp, AlertTriangle, DollarSign, BarChart3, Download
} from 'lucide-react';

// Category structure (matching Python ERP)
const CATEGORY_STRUCTURE: Record<string, { name: string; icon: string; subcategories: Record<string, string> }> = {
  'MEAT': {
    name: 'Et Urunleri',
    icon: '🥩',
    subcategories: {
      'BEEF': 'Dana',
      'LAMB': 'Kuzu',
      'CHICKEN': 'Tavuk',
      'OTHER': 'Diger',
    },
  },
  'DAIRY': {
    name: 'Sut Urunleri',
    icon: '🧀',
    subcategories: {
      'MILK': 'Sut',
      'CHEESE': 'Peynir',
      'YOGURT': 'Yogurt',
    },
  },
  'GROCERY': {
    name: 'Bakkaliye',
    icon: '🛒',
    subcategories: {
      'DRY_GOODS': 'Kuru Gida',
      'CANNED': 'Konserve',
      'SPICES': 'Baharat',
    },
  },
  'BEVERAGES': {
    name: 'Icecekler',
    icon: '🥤',
    subcategories: {
      'WATER': 'Su',
      'JUICE': 'Meyve Suyu',
      'SOFT_DRINKS': 'Gazli Icecek',
    },
  },
  'PRODUCE': {
    name: 'Meyve & Sebze',
    icon: '🥬',
    subcategories: {
      'FRUITS': 'Meyveler',
      'VEGETABLES': 'Sebzeler',
    },
  },
  'BAKERY': {
    name: 'Firindan',
    icon: '🥖',
    subcategories: {
      'BREAD': 'Ekmek',
      'PASTRY': 'Pasta',
    },
  },
};

// Get category display name
function getCategoryDisplayName(code: string): string {
  if (!code) return '-';
  const parts = code.split('.');
  const mainCat = CATEGORY_STRUCTURE[parts[0]];
  if (!mainCat) return code;
  if (parts.length === 1) return `${mainCat.icon} ${mainCat.name}`;
  const subCat = mainCat.subcategories[parts[1]];
  return subCat ? `${mainCat.icon} ${subCat}` : code;
}

// Status badge component
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-3 h-3 rounded-full ${
        isActive ? 'bg-green-500' : 'bg-red-500'
      }`}
    />
  );
}

// Stock badge component
function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return <span className="text-red-600 font-medium">{stock}</span>;
  } else if (stock < 10) {
    return <span className="text-amber-600 font-medium">{stock}</span>;
  }
  return <span className="text-gray-900">{stock}</span>;
}

interface Product {
  id: string;
  basic?: {
    name?: string;
    category?: string;
    brand?: string;
    sku?: string;
  };
  barcodes?: {
    mainBarcode?: string;
  };
  pricing?: {
    sellPrice?: number;
    baseCost?: number;
    vatRate?: number;
  };
  stock?: {
    totalStock?: number;
  };
  audit?: {
    isActive?: boolean;
  };
  // Flat structure support
  name?: string;
  barcode?: string;
  price?: number;
  stock_qty?: number;
  isActive?: boolean;
}

// Helper to get field from nested or flat structure
function getField<T>(product: Product, nestedPath: string[], flatKey: string, defaultVal: T): T {
  // Try nested first
  let value: any = product;
  for (const key of nestedPath) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = undefined;
      break;
    }
  }
  if (value !== undefined && value !== null) return value as T;

  // Try flat
  const flatValue = (product as any)[flatKey];
  if (flatValue !== undefined && flatValue !== null) return flatValue as T;

  return defaultVal;
}

// Page size for pagination
const PAGE_SIZE = 100;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Load products from RTDB
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToRTDB('products', (data) => {
      setProducts(data || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Only active products or all (no status filter for now)
      const isActive = getField(product, ['audit', 'isActive'], 'isActive', true);

      // Search filter
      const name = getField(product, ['basic', 'name'], 'name', '');
      const barcode = getField(product, ['barcodes', 'mainBarcode'], 'barcode', '');
      const sku = getField(product, ['basic', 'sku'], 'sku', '');

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        name.toLowerCase().includes(searchLower) ||
        barcode.toLowerCase().includes(searchLower) ||
        sku.toLowerCase().includes(searchLower);

      // Category filter
      const category = getField(product, ['basic', 'category'], 'category', '');
      const matchesCategory = categoryFilter === 'all' ||
        category.startsWith(categoryFilter) ||
        category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, categoryFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => getField(p, ['audit', 'isActive'], 'isActive', true)).length;
    const lowStock = products.filter(p => {
      const stock = getField(p, ['stock', 'totalStock'], 'stock_qty', 0);
      return stock < 10 && stock >= 0;
    }).length;
    const totalValue = products.reduce((sum, p) => {
      const stock = getField(p, ['stock', 'totalStock'], 'stock_qty', 0);
      const cost = getField(p, ['pricing', 'baseCost'], 'cost', 0);
      return sum + (stock * cost);
    }, 0);
    return { total, active, lowStock, totalValue };
  }, [products]);

  // Build category options
  const categoryOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: 'all', label: 'Tum Kategoriler' },
    ];
    Object.entries(CATEGORY_STRUCTURE).forEach(([code, data]) => {
      options.push({ value: code, label: `${data.icon} ${data.name}` });
      Object.entries(data.subcategories).forEach(([subCode, subName]) => {
        options.push({ value: `${code}.${subCode}`, label: `   ├─ ${subName}` });
      });
    });
    return options;
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleView = (product: Product) => {
    setViewProduct(product);
    setCardDialogOpen(true);
  };

  const handleOpenReport = () => {
    setReportDialogOpen(true);
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const currentStatus = getField(product, ['audit', 'isActive'], 'isActive', true);
      const newStatus = !currentStatus;

      if (product.audit) {
        await updateData(`products/${product.id}/audit`, {
          isActive: newStatus,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await updateData(`products/${product.id}`, {
          isActive: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Durum guncellenemedi: ' + (error as Error).message);
    }
  };

  const handleDelete = async (product: Product) => {
    const name = getField(product, ['basic', 'name'], 'name', 'Urun');
    if (!confirm(`"${name}" urununu silmek istediginize emin misiniz?`)) return;

    try {
      await removeData(`products/${product.id}`);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme hatasi: ' + (error as Error).message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Urunler</h1>
            <p className="text-sm text-gray-500 mt-1">
              {stats.total} urun - {stats.active} aktif
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenReport}
            >
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Rapor</span>
            </Button>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Yeni Urun</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-xl font-semibold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Dusuk Stok</p>
                <p className="text-xl font-semibold text-gray-900">{stats.lowStock}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stok Degeri</p>
                <p className="text-xl font-semibold text-gray-900">
                  €{stats.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Urun ara (isim, barkod, SKU)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="bg-white rounded-lg border overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Barkod</TableHead>
                <TableHead>Urun Adi</TableHead>
                <TableHead className="w-[160px]">Kategori</TableHead>
                <TableHead className="w-[100px] text-right">Fiyat</TableHead>
                <TableHead className="w-[80px] text-right">Stok</TableHead>
                <TableHead className="w-[60px] text-center">Durum</TableHead>
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
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {searchQuery || categoryFilter !== 'all'
                      ? 'Filtrelere uygun urun bulunamadi'
                      : 'Henuz urun eklenmemis'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => {
                  const barcode = getField(product, ['barcodes', 'mainBarcode'], 'barcode', '-');
                  const name = getField(product, ['basic', 'name'], 'name', 'Bilinmiyor');
                  const category = getField(product, ['basic', 'category'], 'category', '-');
                  const price = getField(product, ['pricing', 'sellPrice'], 'price', 0);
                  const stock = getField(product, ['stock', 'totalStock'], 'stock_qty', 0);
                  const isActive = getField(product, ['audit', 'isActive'], 'isActive', true);

                  return (
                    <TableRow
                      key={product.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onDoubleClick={() => handleView(product)}
                    >
                      <TableCell className="font-mono text-sm">{barcode}</TableCell>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {getCategoryDisplayName(category)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StockBadge stock={stock} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge isActive={isActive} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(product)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Urun Karti
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Duzenle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                              {isActive ? '🔴 Pasif Yap' : '🟢 Aktif Yap'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(product)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer with pagination and stats */}
      <div className="bg-white border-t px-4 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:gap-4 text-xs lg:text-sm text-gray-600">
          <span>📦 Toplam: {stats.total}</span>
          <span>✅ Aktif: {stats.active}</span>
          <span>⚠️ Dusuk Stok: {stats.lowStock}</span>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(0)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-3 text-sm font-medium text-gray-700">
            {currentPage + 1} / {totalPages} ({filteredProducts.length})
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(totalPages - 1)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Product Dialog - for add/edit */}
      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSave={() => setDialogOpen(false)}
      />

      {/* Product Card Dialog - for viewing details */}
      <ProductCardDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        product={viewProduct}
        onEdit={(productId) => {
          const product = products.find(p => p.id === productId);
          if (product) {
            setSelectedProduct(product);
            setDialogOpen(true);
          }
        }}
      />

      {/* Stock Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportType="stock"
      />
    </div>
  );
}
