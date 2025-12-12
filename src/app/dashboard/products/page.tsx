'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { getProductsFiltered, getProductStats, invalidateProductsCache } from '@/services/firebase';
import { ProductDialog } from '@/components/dialogs/product-dialog';
import { ProductCardDialog } from '@/components/dialogs/product-card-dialog';
import { ReportDialog } from '@/components/dialogs/report-dialog';
import {
  Plus, RefreshCw, MoreHorizontal, Pencil, Trash2, Eye, Search,
  Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  TrendingUp, AlertTriangle, DollarSign, BarChart3, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  CATEGORIES,
  matchesCategory,
} from '@/services/categories';

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
  name?: string;
  barcode?: string;
  price?: number;
  stock_qty?: number;
  isActive?: boolean;
}

// Helper to get field from nested or flat structure
function getField<T>(product: Product, nestedPath: string[], flatKey: string, defaultVal: T): T {
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

  const flatValue = (product as any)[flatKey];
  if (flatValue !== undefined && flatValue !== null) return flatValue as T;

  return defaultVal;
}

// Page size
const PAGE_SIZE = 50;

export default function ProductsPage() {
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter states
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0, totalValue: 0 });

  // Load products
  const loadProducts = useCallback(async (page: number = 0, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getProductsFiltered({
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery,
        category: categoryFilter,
        sortBy,
        sortDir,
      });

      setProducts(result.items);
      setTotalProducts(result.total);
      setTotalPages(result.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, categoryFilter, sortBy, sortDir]);

  // Initial load + stats
  useEffect(() => {
    loadProducts(0);
    getProductStats().then(setStats);
  }, [loadProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput);
        setCurrentPage(0);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchQuery]);

  // Reload when filters change
  useEffect(() => {
    loadProducts(0);
  }, [searchQuery, categoryFilter, sortBy, sortDir, loadProducts]);

  // Category options
  const categoryOptions = useMemo(() => {
    const options: { value: string; label: string; isHeader?: boolean }[] = [
      { value: 'all', label: 'Tum Kategoriler' },
    ];

    CATEGORIES.forEach(cat => {
      options.push({
        value: cat.code,
        label: `${cat.nameTR}`,
        isHeader: true,
      });
      cat.subcategories.forEach(sub => {
        options.push({
          value: sub.fullCode,
          label: `  ${sub.nameTR}`,
        });
      });
    });

    return options;
  }, []);

  // Handlers
  const handleRefresh = async () => {
    invalidateProductsCache();
    setLoading(true);
    await loadProducts(0);
    const newStats = await getProductStats();
    setStats(newStats);
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

  const handleDelete = async (product: Product) => {
    if (confirm(`"${getField(product, ['basic', 'name'], 'name', 'Urun')}" urununu silmek istediginize emin misiniz?`)) {
      // TODO: Delete product
      invalidateProductsCache();
      loadProducts(currentPage);
    }
  };

  const handleSort = (field: 'name' | 'stock' | 'price') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      loadProducts(newPage);
    }
  };

  // Sort icon helper
  const SortIcon = ({ field }: { field: 'name' | 'stock' | 'price' }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#EAE8E3]">
      {/* Header */}
      <div className="bg-white border-b px-4 lg:px-8 py-4 space-y-4">
        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Urunler</h1>
              <p className="text-xs sm:text-sm text-gray-500">{totalProducts} urun listeleniyor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReportDialogOpen(true)}>
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Rapor</span>
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Yeni Urun</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-xs sm:text-sm text-gray-600">Toplam</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs sm:text-sm text-gray-600">Aktif</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs sm:text-sm text-gray-600">Dusuk Stok</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.lowStock}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-xs sm:text-sm text-gray-600">Deger</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-purple-600">
              {(stats.totalValue / 1000).toFixed(0)}K
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Urun ara (isim, barkod, SKU)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {categoryOptions.map((opt) => (
                opt.isHeader ? (
                  <SelectItem key={opt.value} value={opt.value} className="font-semibold bg-gray-50">
                    {opt.label}
                  </SelectItem>
                ) : (
                  <SelectItem key={opt.value} value={opt.value} className="pl-6">
                    {opt.label}
                  </SelectItem>
                )
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="bg-white rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Barkod</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Urun Adi
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center justify-end">
                    Stok
                    <SortIcon field="stock" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end">
                    Fiyat
                    <SortIcon field="price" />
                  </div>
                </TableHead>
                <TableHead className="w-[60px] text-center">Durum</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Urunler yukleniyor...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    {searchInput || categoryFilter !== 'all'
                      ? 'Filtrelere uygun urun bulunamadi'
                      : 'Henuz urun yok'}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const barcode = getField(product, ['barcodes', 'mainBarcode'], 'barcode', '-');
                  const name = getField(product, ['basic', 'name'], 'name', 'Bilinmiyor');
                  const category = getField(product, ['basic', 'category'], 'category', '-');
                  const stock = getField(product, ['stock', 'totalStock'], 'stock_qty', 0);
                  const price = getField(product, ['pricing', 'sellPrice'], 'price', 0);
                  const isActive = getField(product, ['audit', 'isActive'], 'isActive', true);

                  return (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">{barcode}</TableCell>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{category}</TableCell>
                      <TableCell className="text-right">
                        <StockBadge stock={stock} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {price.toFixed(2)} EUR
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
                              Goruntule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Duzenle
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

      {/* Footer with pagination */}
      <div className="bg-white border-t px-4 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:gap-4 text-xs lg:text-sm text-gray-600">
          <span>Toplam: {totalProducts} urun</span>
          {searchInput && <span>| Filtreli: {products.length}</span>}
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0 || loading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-3 text-sm font-medium text-gray-700">
            {currentPage + 1} / {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1 || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1 || loading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSave={() => {
          invalidateProductsCache();
          loadProducts(currentPage);
          getProductStats().then(setStats);
        }}
      />

      {viewProduct && (
        <ProductCardDialog
          open={cardDialogOpen}
          onOpenChange={setCardDialogOpen}
          product={viewProduct}
        />
      )}

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </div>
  );
}
