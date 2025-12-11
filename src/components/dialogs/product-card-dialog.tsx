'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  Loader2, Package, DollarSign, Percent, Barcode,
  Building2, Truck, ShoppingCart, TrendingUp, TrendingDown,
  Pencil, X, CheckCircle, AlertTriangle, Clock
} from 'lucide-react';

// =================== INTERFACES ===================
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
    caseBarcode?: {
      enabled?: boolean;
      barcode?: string;
      caseQuantity?: number;
    };
  };
  pricing?: {
    baseCost?: number;
    sellPrice?: number;
    vatRate?: number;
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
    supplierSKU?: string;
    lastPurchasePrice?: number;
  };
  audit?: {
    createdAt?: string;
    updatedAt?: string;
    isActive?: boolean;
  };
  // Flat structure support
  name?: string;
  stock_qty?: number;
  price?: number;
  cost?: number;
  barcode?: string;
}

interface Branch {
  id: string;
  name?: string;
  type?: string;
}

interface SaleInvoice {
  id: string;
  invoiceNo?: string;
  date?: string;
  createdAt?: string;
  items?: Array<{
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
}

interface Purchase {
  id: string;
  supplierName?: string;
  date?: string;
  createdAt?: string;
  items?: Array<{
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
}

interface ProductCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onEdit?: (productId: string) => void;
}

// =================== STAT CARD COMPONENT ===================
function StatCard({
  icon,
  title,
  value,
  color = 'gray',
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
    gray: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
        {icon}
        <span>{title}</span>
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

// =================== STATUS BADGE ===================
function StockStatusBadge({ current, min }: { current: number; min: number }) {
  if (current <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <X className="h-3 w-3 mr-1" />
        Stok Yok
      </span>
    );
  }
  if (current < min) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Dusuk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <CheckCircle className="h-3 w-3 mr-1" />
      Normal
    </span>
  );
}

// =================== MAIN COMPONENT ===================
export function ProductCardDialog({ open, onOpenChange, product, onEdit }: ProductCardDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SaleInvoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // =================== LOAD DATA ===================
  useEffect(() => {
    if (!open || !product) return;

    setLoading(true);

    // RTDB'den şube verilerini çek
    const unsubBranches = subscribeToRTDB('branches', (data) => {
      console.log('ProductCardDialog: branches loaded', data.length);
      setBranches(data || []);
    });

    // RTDB'den satış faturalarını çek
    const unsubSales = subscribeToRTDB('sale_invoices', (data) => {
      console.log('ProductCardDialog: sale_invoices loaded', data.length);
      setSalesInvoices(data || []);
    });

    // RTDB'den alış faturalarını çek
    const unsubPurchases = subscribeToRTDB('purchases', (data) => {
      console.log('ProductCardDialog: purchases loaded', data.length);
      setPurchases(data || []);
      setLoading(false);
    });

    return () => {
      unsubBranches();
      unsubSales();
      unsubPurchases();
    };
  }, [open, product]);

  // =================== HELPER FUNCTIONS ===================
  const getProductName = (): string => {
    return product?.basic?.name || product?.name || '-';
  };

  const getProductCategory = (): string => {
    return product?.basic?.category || '-';
  };

  const getProductBrand = (): string => {
    return product?.basic?.brand || '-';
  };

  const getProductSKU = (): string => {
    return product?.basic?.sku || '-';
  };

  const getMainBarcode = (): string => {
    return product?.barcodes?.mainBarcode || product?.barcode || '-';
  };

  const getCost = (): number => {
    return product?.pricing?.baseCost || product?.cost || 0;
  };

  const getSellPrice = (): number => {
    return product?.pricing?.sellPrice || product?.price || 0;
  };

  const getVatRate = (): number => {
    return product?.pricing?.vatRate || 0;
  };

  const getTotalStock = (): number => {
    return product?.stock?.totalStock || product?.stock_qty || 0;
  };

  const getStockValue = (): number => {
    return getTotalStock() * getCost();
  };

  const getProfitMargin = (): number => {
    const sell = getSellPrice();
    const cost = getCost();
    if (sell <= 0) return 0;
    return ((sell - cost) / sell) * 100;
  };

  // =================== BRANCH STOCK DATA ===================
  const branchStockData = useMemo(() => {
    if (!product?.stock?.branchStock) return [];

    return Object.entries(product.stock.branchStock).map(([branchId, stockData]) => {
      const branch = branches.find(b => b.id === branchId);
      return {
        branchId,
        branchName: branch?.name || branchId,
        currentStock: stockData?.currentStock || 0,
        minStock: stockData?.minStock || 10,
        maxStock: stockData?.maxStock || 100,
      };
    });
  }, [product, branches]);

  // =================== SALES HISTORY ===================
  const salesHistory = useMemo(() => {
    if (!product) return [];

    const history: Array<{
      date: string;
      invoiceNo: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    salesInvoices.forEach(invoice => {
      const items = invoice.items || [];
      items.forEach(item => {
        if (item.productId === product.id) {
          history.push({
            date: (invoice.date || invoice.createdAt || '-').substring(0, 10),
            invoiceNo: invoice.invoiceNo || '-',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            total: item.total || 0,
          });
        }
      });
    });

    return history.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [product, salesInvoices]);

  // =================== PURCHASE HISTORY ===================
  const purchaseHistory = useMemo(() => {
    if (!product) return [];

    const history: Array<{
      date: string;
      supplierName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    purchases.forEach(purchase => {
      const items = purchase.items || [];
      items.forEach(item => {
        if (item.productId === product.id) {
          history.push({
            date: (purchase.date || purchase.createdAt || '-').substring(0, 10),
            supplierName: purchase.supplierName || '-',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            total: item.total || 0,
          });
        }
      });
    });

    return history.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [product, purchases]);

  // =================== CASE BARCODE INFO ===================
  const caseBarcode = product?.barcodes?.caseBarcode;
  const hasCaseBarcode = caseBarcode?.enabled && caseBarcode?.barcode;

  // =================== SUPPLIER INFO ===================
  const supplierInfo = product?.supplier;
  const hasSupplierInfo = supplierInfo?.supplierName && supplierInfo?.supplierSKU;

  if (!product) return null;

  // =================== RENDER ===================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {getProductName()}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                {getProductCategory()} - {getProductBrand()} - SKU: {getProductSKU()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                €{getSellPrice().toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                Maliyet: €{getCost().toFixed(2)} - Kar: %{getProfitMargin().toFixed(1)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<Package className="h-4 w-4" />}
                  title="Toplam Stok"
                  value={getTotalStock().toFixed(0)}
                  color="blue"
                />
                <StatCard
                  icon={<DollarSign className="h-4 w-4" />}
                  title="Stok Degeri"
                  value={`€${getStockValue().toFixed(2)}`}
                  color="green"
                />
                <StatCard
                  icon={<Percent className="h-4 w-4" />}
                  title="KDV Orani"
                  value={`%${getVatRate().toFixed(1)}`}
                  color="purple"
                />
                <StatCard
                  icon={<Barcode className="h-4 w-4" />}
                  title="Barkod"
                  value={getMainBarcode()}
                  color="gray"
                />
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="info">Genel Bilgiler</TabsTrigger>
                  <TabsTrigger value="stock">Stok Durumu</TabsTrigger>
                  <TabsTrigger value="purchases">Alis Gecmisi</TabsTrigger>
                  <TabsTrigger value="sales">Satis Gecmisi</TabsTrigger>
                  <TabsTrigger value="movements">Stok Hareketleri</TabsTrigger>
                </TabsList>

                {/* =================== INFO TAB =================== */}
                <TabsContent value="info" className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Temel Bilgiler</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Urun Adi:</span>
                          <span className="font-medium">{getProductName()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Kategori:</span>
                          <span className="font-medium">{getProductCategory()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Marka:</span>
                          <span className="font-medium">{getProductBrand()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">SKU:</span>
                          <span className="font-medium">{getProductSKU()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ana Barkod:</span>
                          <span className="font-mono font-medium">{getMainBarcode()}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Maliyet:</span>
                          <span className="font-medium">€{getCost().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Satis Fiyati:</span>
                          <span className="font-medium">€{getSellPrice().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">KDV Orani:</span>
                          <span className="font-medium">%{getVatRate().toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Olusturulma:</span>
                          <span className="font-medium">{product.audit?.createdAt?.substring(0, 10) || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Son Guncelleme:</span>
                          <span className="font-medium">{product.audit?.updatedAt?.substring(0, 10) || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case Barcode */}
                  <div className={`rounded-lg border-2 p-4 ${hasCaseBarcode ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <Package className={`h-5 w-5 ${hasCaseBarcode ? 'text-amber-600' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${hasCaseBarcode ? 'text-amber-800' : 'text-gray-500'}`}>
                        Kutu Barkodu:
                      </span>
                      {hasCaseBarcode ? (
                        <>
                          <span className="font-mono font-bold bg-white px-3 py-1 rounded border border-amber-200">
                            {caseBarcode?.barcode}
                          </span>
                          <span className="text-amber-700">
                            Adet: {caseBarcode?.caseQuantity || 0}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Tanimli degil</span>
                      )}
                    </div>
                  </div>

                  {/* Supplier Info */}
                  <div className={`rounded-lg border-2 p-4 ${hasSupplierInfo ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Truck className={`h-5 w-5 ${hasSupplierInfo ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${hasSupplierInfo ? 'text-purple-800' : 'text-gray-500'}`}>
                        Tedarikci Stok Kodu:
                      </span>
                    </div>
                    {hasSupplierInfo ? (
                      <div className="flex items-center gap-4 ml-8">
                        <div className="bg-white rounded border border-purple-200 px-3 py-2">
                          <div className="text-xs text-purple-600">{supplierInfo?.supplierName}</div>
                          <div className="font-mono font-bold text-purple-800">{supplierInfo?.supplierSKU}</div>
                          {supplierInfo?.lastPurchasePrice && (
                            <div className="text-xs text-purple-500">
                              Son: €{supplierInfo.lastPurchasePrice.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic ml-8">Tedarikci stok kodu tanimli degil</span>
                    )}
                  </div>
                </TabsContent>

                {/* =================== STOCK TAB =================== */}
                <TabsContent value="stock" className="space-y-4">
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-amber-600" />
                      Toplam Stok: {getTotalStock().toFixed(0)}
                    </h4>

                    {branchStockData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sube</TableHead>
                            <TableHead className="text-right">Mevcut</TableHead>
                            <TableHead className="text-right">Minimum</TableHead>
                            <TableHead className="text-right">Maksimum</TableHead>
                            <TableHead>Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {branchStockData.map((branch) => (
                            <TableRow key={branch.branchId}>
                              <TableCell className="font-medium">{branch.branchName}</TableCell>
                              <TableCell className={`text-right font-semibold ${branch.currentStock <= 0 ? 'text-red-600' : branch.currentStock < branch.minStock ? 'text-amber-600' : ''}`}>
                                {branch.currentStock.toFixed(0)}
                              </TableCell>
                              <TableCell className="text-right">{branch.minStock}</TableCell>
                              <TableCell className="text-right">{branch.maxStock}</TableCell>
                              <TableCell>
                                <StockStatusBadge current={branch.currentStock} min={branch.minStock} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-500 italic">Sube bazli stok bilgisi yok</p>
                    )}
                  </div>
                </TabsContent>

                {/* =================== PURCHASES TAB =================== */}
                <TabsContent value="purchases" className="space-y-4">
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-amber-600" />
                        Alis Gecmisi
                      </h4>
                    </div>
                    <div className="max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Tedarikci</TableHead>
                            <TableHead className="text-right">Miktar</TableHead>
                            <TableHead className="text-right">Birim Fiyat</TableHead>
                            <TableHead className="text-right">Toplam</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                Alis gecmisi bulunamadi
                              </TableCell>
                            </TableRow>
                          ) : (
                            purchaseHistory.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.date}</TableCell>
                                <TableCell>{item.supplierName}</TableCell>
                                <TableCell className="text-right">{item.quantity.toFixed(0)}</TableCell>
                                <TableCell className="text-right">€{item.unitPrice.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-semibold">€{item.total.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* =================== SALES TAB =================== */}
                <TabsContent value="sales" className="space-y-4">
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Satis Gecmisi
                      </h4>
                    </div>
                    <div className="max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Fatura No</TableHead>
                            <TableHead className="text-right">Miktar</TableHead>
                            <TableHead className="text-right">Birim Fiyat</TableHead>
                            <TableHead className="text-right">Toplam</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                Satis gecmisi bulunamadi
                              </TableCell>
                            </TableRow>
                          ) : (
                            salesHistory.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.date}</TableCell>
                                <TableCell className="font-mono">{item.invoiceNo}</TableCell>
                                <TableCell className="text-right">{item.quantity.toFixed(0)}</TableCell>
                                <TableCell className="text-right">€{item.unitPrice.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-semibold text-green-600">€{item.total.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* =================== MOVEMENTS TAB =================== */}
                <TabsContent value="movements" className="space-y-4">
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-purple-600" />
                        Stok Hareketleri
                      </h4>
                    </div>
                    <div className="p-8 text-center text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Stok hareketleri yakinda...</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (onEdit && product) {
                onEdit(product.id);
                onOpenChange(false);
              }
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Duzenle
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
