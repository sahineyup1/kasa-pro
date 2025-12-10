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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { subscribeToRTDB, updateData, removeData } from '@/services/firebase';
import {
  Plus, RefreshCw, MoreHorizontal, Search, Download, Eye, Send, Trash2, Edit,
  Warehouse, Package, AlertTriangle, Clock, ShoppingCart, FileText, CheckCircle,
  Calendar, ClipboardList, Timer, TrendingUp, TrendingDown, ArrowRightLeft, Truck
} from 'lucide-react';
import { ViewMissingListDialog, NewMissingListDialog } from '@/components/dialogs/missing-list-dialog';
import { ViewOrderDialog, NewOrderDialog, EditOrderDialog, ConvertToInvoiceDialog } from '@/components/dialogs/order-dialog';

// =================== STATUS BADGES ===================

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-800',
    'approved': 'bg-blue-100 text-blue-800',
    'invoiced': 'bg-purple-100 text-purple-800',
    'shipped': 'bg-cyan-100 text-cyan-800',
    'completed': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    'pending': 'Bekliyor',
    'approved': 'Onaylandi',
    'invoiced': 'Faturalandi',
    'shipped': 'Sevk Edildi',
    'completed': 'Tamamlandi',
    'rejected': 'Reddedildi',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function MissingListStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-800',
    'sent': 'bg-blue-100 text-blue-800',
    'processing': 'bg-purple-100 text-purple-800',
    'completed': 'bg-green-100 text-green-800',
  };

  const labels: Record<string, string> = {
    'pending': 'Bekliyor',
    'sent': 'Gonderildi',
    'processing': 'Isleniyor',
    'completed': 'Tamamlandi',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function StockStatusBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Stok Yok
      </span>
    );
  }
  if (stock < minStock) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        Dusuk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Normal
    </span>
  );
}

// =================== INTERFACES ===================

interface Product {
  id: string;
  basic?: { name?: string; category?: string };
  barcodes?: { mainBarcode?: string };
  stock?: { totalStock?: number; minStock?: number };
  name?: string;
  barcode?: string;
  stock_qty?: number;
}

interface MissingList {
  id: string;
  listNo?: string;
  branchId?: string;
  status?: string;
  items?: Array<{
    productId?: string;
    productName?: string;
    quantity?: number;
    unit?: string;
  }>;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  sentAt?: string;
  completedAt?: string;
}

interface InventoryCount {
  id: string;
  branch?: string;
  barcode?: string;
  name?: string;
  skt?: string;
  qty?: number;
  updatedAt?: string;
}

interface LotTracking {
  id: string;
  barcode?: string;
  productName?: string;
  lotId?: string;
  expiryDate?: string;
  quantity?: number;
}

interface Order {
  id: string;
  orderNo?: string;
  branchId?: string;
  source?: string;
  status?: string;
  customerName?: string;
  createdAt?: string;
  items?: Array<{
    productId?: string;
    productName?: string;
    quantity?: number;
    unit?: string;
    price?: number;
  }>;
  total?: number;
  notes?: string;
}

// =================== STAT CARD ===================

function StatCard({
  icon,
  title,
  value,
  color = 'gray',
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
    amber: 'bg-amber-50',
    purple: 'bg-purple-50',
    gray: 'bg-gray-50',
  };

  const iconClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  const textClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    gray: 'text-gray-900',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-xl font-semibold ${textClasses[color]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

// =================== MAIN COMPONENT ===================

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [missingLists, setMissingLists] = useState<MissingList[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([]);
  const [lotTrackings, setLotTrackings] = useState<LotTracking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Dialog states - Missing List
  const [viewMissingDialogOpen, setViewMissingDialogOpen] = useState(false);
  const [newMissingDialogOpen, setNewMissingDialogOpen] = useState(false);
  const [selectedMissingList, setSelectedMissingList] = useState<MissingList | null>(null);

  // Dialog states - Orders
  const [viewOrderDialogOpen, setViewOrderDialogOpen] = useState(false);
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false);
  const [editOrderDialogOpen, setEditOrderDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // =================== LOAD DATA ===================
  useEffect(() => {
    setLoading(true);

    const unsubProducts = subscribeToRTDB('products', (data) => {
      setProducts(data || []);
    });

    const unsubMissing = subscribeToRTDB('missing_lists', (data) => {
      setMissingLists(data || []);
    });

    const unsubInventory = subscribeToRTDB('inventory_counts', (data) => {
      setInventoryCounts(data || []);
    });

    const unsubLots = subscribeToRTDB('lot_tracking', (data) => {
      setLotTrackings(data || []);
    });

    const unsubOrders = subscribeToRTDB('orders', (data) => {
      setOrders(data || []);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubMissing();
      unsubInventory();
      unsubLots();
      unsubOrders();
    };
  }, []);

  // =================== DASHBOARD STATS ===================
  const dashboardStats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => {
      const stock = p.stock?.totalStock ?? p.stock_qty ?? 0;
      const minStock = p.stock?.minStock ?? 10;
      return stock < minStock && stock > 0;
    }).length;
    const outOfStock = products.filter(p => {
      const stock = p.stock?.totalStock ?? p.stock_qty ?? 0;
      return stock <= 0;
    }).length;

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const missingItems = missingLists.filter(m => m.status === 'pending').length;

    return {
      totalProducts,
      lowStock,
      outOfStock,
      pendingOrders,
      completedOrders,
      missingItems,
    };
  }, [products, orders, missingLists]);

  // =================== MISSING LIST STATS ===================
  const missingListStats = useMemo(() => {
    const total = missingLists.length;
    const pending = missingLists.filter(m => m.status === 'pending').length;
    const sent = missingLists.filter(m => m.status === 'sent').length;
    const completed = missingLists.filter(m => m.status === 'completed').length;
    return { total, pending, sent, completed };
  }, [missingLists]);

  // =================== ORDER STATS ===================
  const orderStats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const approved = orders.filter(o => o.status === 'approved').length;
    const invoiced = orders.filter(o => o.status === 'invoiced').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    return { total, pending, approved, invoiced, completed };
  }, [orders]);

  // =================== LOT/SKT STATS ===================
  const lotStats = useMemo(() => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    let expiringThisMonth = 0;
    let expiringNextMonth = 0;
    let totalQuantity = 0;

    lotTrackings.forEach(lot => {
      if (!lot.expiryDate) return;

      // Parse date
      let expDate: Date;
      if (lot.expiryDate.includes('.')) {
        const parts = lot.expiryDate.split('.');
        expDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        expDate = new Date(lot.expiryDate);
      }

      const qty = lot.quantity || 0;
      totalQuantity += qty;

      if (expDate <= thisMonth && expDate >= today) {
        expiringThisMonth++;
      } else if (expDate <= nextMonth && expDate > thisMonth) {
        expiringNextMonth++;
      }
    });

    return {
      total: lotTrackings.length,
      expiringThisMonth,
      expiringNextMonth,
      totalQuantity,
    };
  }, [lotTrackings]);

  // =================== FILTERED DATA ===================
  const filteredMissingLists = useMemo(() => {
    return missingLists
      .filter(m => {
        const matchesSearch = !searchQuery ||
          m.listNo?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [missingLists, searchQuery, statusFilter]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => {
        const matchesSearch = !searchQuery ||
          o.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [orders, searchQuery, statusFilter]);

  const filteredInventory = useMemo(() => {
    return inventoryCounts
      .filter(i => {
        const matchesSearch = !searchQuery ||
          i.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBranch = branchFilter === 'all' || i.branch === branchFilter;
        return matchesSearch && matchesBranch;
      })
      .sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  }, [inventoryCounts, searchQuery, branchFilter]);

  // =================== HANDLERS ===================
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleExportExcel = (type: string) => {
    // TODO: Implement Excel export
    alert(`${type} Excel export - Yakin zamanda`);
  };

  // =================== MISSING LIST HANDLERS ===================
  const handleViewMissingList = (list: MissingList) => {
    setSelectedMissingList(list);
    setViewMissingDialogOpen(true);
  };

  const handleSendMissingList = async (list: MissingList) => {
    if (!confirm(`"${list.listNo}" listesini depoya gondermek istediginize emin misiniz?`)) return;

    try {
      await updateData(`missing_lists/${list.id}`, {
        status: 'sent',
        sentAt: new Date().toISOString(),
        sentBy: 'admin',
      });
    } catch (error) {
      console.error('Send error:', error);
      alert('Gonderme hatasi: ' + (error as Error).message);
    }
  };

  const handleDeleteMissingList = async (list: MissingList) => {
    if (!confirm(`"${list.listNo}" listesini silmek istediginize emin misiniz?`)) return;

    try {
      await removeData(`missing_lists/${list.id}`);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme hatasi: ' + (error as Error).message);
    }
  };

  const handleCompleteMissingList = async (list: MissingList) => {
    if (!confirm(`"${list.listNo}" listesini tamamlandi olarak isaretlemek istediginize emin misiniz?`)) return;

    try {
      await updateData(`missing_lists/${list.id}`, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: 'admin',
      });
    } catch (error) {
      console.error('Complete error:', error);
      alert('Tamamlama hatasi: ' + (error as Error).message);
    }
  };

  // =================== ORDER HANDLERS ===================
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewOrderDialogOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditOrderDialogOpen(true);
  };

  const handleApproveOrder = async (order: Order) => {
    if (!confirm(`"${order.orderNo}" siparisini onaylamak istediginize emin misiniz?`)) return;

    try {
      await updateData(`orders/${order.id}`, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'admin',
      });
    } catch (error) {
      console.error('Approve error:', error);
      alert('Onaylama hatasi: ' + (error as Error).message);
    }
  };

  const handleRejectOrder = async (order: Order) => {
    if (!confirm(`"${order.orderNo}" siparisini reddetmek istediginize emin misiniz?`)) return;

    try {
      await updateData(`orders/${order.id}`, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: 'admin',
      });
    } catch (error) {
      console.error('Reject error:', error);
      alert('Reddetme hatasi: ' + (error as Error).message);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!confirm(`"${order.orderNo}" siparisini silmek istediginize emin misiniz?`)) return;

    try {
      await removeData(`orders/${order.id}`);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme hatasi: ' + (error as Error).message);
    }
  };

  const handleConvertToInvoice = (order: Order) => {
    setSelectedOrder(order);
    setInvoiceDialogOpen(true);
  };

  const handleCompleteOrder = async (order: Order) => {
    if (!confirm(`"${order.orderNo}" siparisini tamamlamak istediginize emin misiniz?`)) return;

    try {
      await updateData(`orders/${order.id}`, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: 'admin',
      });
    } catch (error) {
      console.error('Complete error:', error);
      alert('Tamamlama hatasi: ' + (error as Error).message);
    }
  };

  // =================== RENDER ===================
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Depo Yonetimi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Stok takibi, eksik listesi, envanter ve siparis islemleri
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              <Warehouse className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Depo</span> Ozeti
            </TabsTrigger>
            <TabsTrigger value="missing" className="text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Eksik</span> Liste
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">
              <Package className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Envanter</span> Sayim
            </TabsTrigger>
            <TabsTrigger value="lots" className="text-xs sm:text-sm">
              <Timer className="h-4 w-4 mr-1 sm:mr-2" />
              Lot/SKT
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">
              <ShoppingCart className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Satis</span> Siparis
            </TabsTrigger>
          </TabsList>

          {/* =================== DASHBOARD TAB =================== */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stok Durumu */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stok Durumu</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  icon={<Package className="h-5 w-5" />}
                  title="Toplam Urun"
                  value={dashboardStats.totalProducts}
                  color="blue"
                />
                <StatCard
                  icon={<AlertTriangle className="h-5 w-5" />}
                  title="Dusuk Stok"
                  value={dashboardStats.lowStock}
                  color="amber"
                />
                <StatCard
                  icon={<Package className="h-5 w-5" />}
                  title="Tukenen Urunler"
                  value={dashboardStats.outOfStock}
                  color="red"
                />
              </div>
            </div>

            {/* Islemler */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Islemler</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  icon={<ShoppingCart className="h-5 w-5" />}
                  title="Bekleyen Siparisler"
                  value={dashboardStats.pendingOrders}
                  color="purple"
                />
                <StatCard
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Eksik Urunler"
                  value={dashboardStats.missingItems}
                  color="amber"
                />
                <StatCard
                  icon={<CheckCircle className="h-5 w-5" />}
                  title="Tamamlanan Siparisler"
                  value={dashboardStats.completedOrders}
                  color="green"
                />
              </div>
            </div>

            {/* Dusuk Stok Listesi */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dusuk Stoklu Urunler</h3>
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urun Adi</TableHead>
                      <TableHead className="text-right">Mevcut</TableHead>
                      <TableHead className="text-right">Minimum</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products
                      .filter(p => {
                        const stock = p.stock?.totalStock ?? p.stock_qty ?? 0;
                        const minStock = p.stock?.minStock ?? 10;
                        return stock < minStock;
                      })
                      .slice(0, 10)
                      .map((p) => {
                        const stock = p.stock?.totalStock ?? p.stock_qty ?? 0;
                        const minStock = p.stock?.minStock ?? 10;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {p.basic?.name || p.name || '-'}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                              {stock}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">{minStock}</TableCell>
                            <TableCell>
                              <StockStatusBadge stock={stock} minStock={minStock} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {products.filter(p => {
                      const stock = p.stock?.totalStock ?? p.stock_qty ?? 0;
                      const minStock = p.stock?.minStock ?? 10;
                      return stock < minStock;
                    }).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          Dusuk stoklu urun yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* =================== MISSING LIST TAB =================== */}
          <TabsContent value="missing" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<FileText className="h-5 w-5" />} title="Toplam Liste" value={missingListStats.total} color="blue" />
              <StatCard icon={<Clock className="h-5 w-5" />} title="Bekleyen" value={missingListStats.pending} color="amber" />
              <StatCard icon={<Send className="h-5 w-5" />} title="Gonderilmis" value={missingListStats.sent} color="purple" />
              <StatCard icon={<CheckCircle className="h-5 w-5" />} title="Tamamlanan" value={missingListStats.completed} color="green" />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Liste no ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum durumlar</SelectItem>
                    <SelectItem value="pending">Bekleyen</SelectItem>
                    <SelectItem value="sent">Gonderilmis</SelectItem>
                    <SelectItem value="completed">Tamamlanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setNewMissingDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Liste
              </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Liste No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Urun Sayisi</TableHead>
                    <TableHead className="hidden lg:table-cell">Not</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : filteredMissingLists.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Eksik listesi bulunamadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMissingLists.slice(0, 50).map((list) => (
                      <TableRow key={list.id}>
                        <TableCell className="font-mono font-medium">{list.listNo || '-'}</TableCell>
                        <TableCell>{list.createdAt?.split('T')[0] || '-'}</TableCell>
                        <TableCell>
                          <MissingListStatusBadge status={list.status || 'pending'} />
                        </TableCell>
                        <TableCell className="text-right">{list.items?.length || 0}</TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-600 text-sm truncate max-w-[200px]">
                          {list.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewMissingList(list)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Goruntule
                              </DropdownMenuItem>
                              {list.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleSendMissingList(list)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Depoya Gonder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteMissingList(list)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Sil
                                  </DropdownMenuItem>
                                </>
                              )}
                              {list.status === 'sent' && (
                                <DropdownMenuItem onClick={() => handleCompleteMissingList(list)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Tamamla
                                </DropdownMenuItem>
                              )}
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

          {/* =================== INVENTORY TAB =================== */}
          <TabsContent value="inventory" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<FileText className="h-5 w-5" />} title="Toplam Kayit" value={inventoryCounts.length} color="blue" />
              <StatCard icon={<Warehouse className="h-5 w-5" />} title="Subeler" value={new Set(inventoryCounts.map(i => i.branch)).size} color="purple" />
              <StatCard icon={<Package className="h-5 w-5" />} title="Farkli Urun" value={new Set(inventoryCounts.map(i => i.barcode)).size} color="green" />
              <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Toplam Miktar" value={inventoryCounts.reduce((sum, i) => sum + (i.qty || 0), 0)} color="amber" />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Barkod veya urun ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sube" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum subeler</SelectItem>
                  <SelectItem value="merkez">Merkez Depo</SelectItem>
                  <SelectItem value="atlas">Atlas Mesnica</SelectItem>
                  <SelectItem value="desetka">Desetka Market</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExportExcel('inventory')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sube</TableHead>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Urun Adi</TableHead>
                    <TableHead>SKT</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="hidden lg:table-cell">Son Guncelleme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Envanter kaydi bulunamadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.slice(0, 100).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.branch || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.barcode || '-'}</TableCell>
                        <TableCell className="font-medium">{item.name || '-'}</TableCell>
                        <TableCell>{item.skt || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{item.qty || 0}</TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-600 text-sm">
                          {item.updatedAt?.split('T')[0] || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* =================== LOT/SKT TAB =================== */}
          <TabsContent value="lots" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Package className="h-5 w-5" />} title="Toplam Lot" value={lotStats.total} color="blue" />
              <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Bu Ay Dolacak" value={lotStats.expiringThisMonth} color="red" />
              <StatCard icon={<Clock className="h-5 w-5" />} title="Gelecek Ay" value={lotStats.expiringNextMonth} color="amber" />
              <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Toplam Miktar" value={lotStats.totalQuantity} color="green" />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Barkod veya urun ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => handleExportExcel('lots')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Urun Adi</TableHead>
                    <TableHead>Lot ID</TableHead>
                    <TableHead>SKT</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Kalan Gun</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : lotTrackings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Lot kaydi bulunamadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    lotTrackings
                      .filter(lot => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return lot.barcode?.toLowerCase().includes(q) ||
                               lot.productName?.toLowerCase().includes(q);
                      })
                      .slice(0, 100)
                      .map((lot) => {
                        let daysLeft = 0;
                        if (lot.expiryDate) {
                          let expDate: Date;
                          if (lot.expiryDate.includes('.')) {
                            const parts = lot.expiryDate.split('.');
                            expDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                          } else {
                            expDate = new Date(lot.expiryDate);
                          }
                          daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        }

                        return (
                          <TableRow key={lot.id} className={daysLeft < 7 ? 'bg-red-50' : daysLeft < 15 ? 'bg-amber-50' : ''}>
                            <TableCell className="font-mono text-sm">{lot.barcode || '-'}</TableCell>
                            <TableCell className="font-medium">{lot.productName || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{lot.lotId || '-'}</TableCell>
                            <TableCell>{lot.expiryDate || '-'}</TableCell>
                            <TableCell className="text-right font-medium">{lot.quantity || 0}</TableCell>
                            <TableCell className={`text-right font-medium ${daysLeft < 7 ? 'text-red-600' : daysLeft < 15 ? 'text-amber-600' : 'text-green-600'}`}>
                              {daysLeft} gun
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* =================== ORDERS TAB =================== */}
          <TabsContent value="orders" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={<ShoppingCart className="h-5 w-5" />} title="Toplam Siparis" value={orderStats.total} color="blue" />
              <StatCard icon={<Clock className="h-5 w-5" />} title="Bekleyen" value={orderStats.pending} color="amber" />
              <StatCard icon={<CheckCircle className="h-5 w-5" />} title="Onaylanan" value={orderStats.approved} color="green" />
              <StatCard icon={<FileText className="h-5 w-5" />} title="Faturalanan" value={orderStats.invoiced} color="purple" />
              <StatCard icon={<Package className="h-5 w-5" />} title="Tamamlanan" value={orderStats.completed} color="gray" />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Siparis no veya musteri ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum durumlar</SelectItem>
                    <SelectItem value="pending">Bekleyen</SelectItem>
                    <SelectItem value="approved">Onaylanan</SelectItem>
                    <SelectItem value="invoiced">Faturalanan</SelectItem>
                    <SelectItem value="completed">Tamamlanan</SelectItem>
                    <SelectItem value="rejected">Reddedilen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setNewOrderDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Siparis
              </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Siparis No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Musteri</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="hidden lg:table-cell">Kaynak</TableHead>
                    <TableHead className="text-right">Urun</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Toplam</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Siparis bulunamadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.slice(0, 50).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">{order.orderNo || '-'}</TableCell>
                        <TableCell>{order.createdAt?.split('T')[0] || '-'}</TableCell>
                        <TableCell className="font-medium">{order.customerName || '-'}</TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status || 'pending'} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {order.source === 'mobile' ? (
                            <span className="text-blue-600">Mobil</span>
                          ) : (
                            <span className="text-gray-600">Desktop</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{order.items?.length || 0}</TableCell>
                        <TableCell className="text-right font-medium hidden sm:table-cell">
                          {order.total ? `€${order.total.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Goruntule
                              </DropdownMenuItem>
                              {order.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Duzenle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleApproveOrder(order)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Onayla
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleRejectOrder(order)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Reddet
                                  </DropdownMenuItem>
                                </>
                              )}
                              {order.status === 'approved' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleConvertToInvoice(order)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Faturala
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCompleteOrder(order)}>
                                    <Truck className="h-4 w-4 mr-2" />
                                    Tamamla
                                  </DropdownMenuItem>
                                </>
                              )}
                              {order.status === 'invoiced' && (
                                <DropdownMenuItem onClick={() => handleCompleteOrder(order)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Tamamla
                                </DropdownMenuItem>
                              )}
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
        </Tabs>
      </div>

      {/* =================== DIALOGS =================== */}

      {/* Missing List Dialogs */}
      <ViewMissingListDialog
        open={viewMissingDialogOpen}
        onOpenChange={setViewMissingDialogOpen}
        list={selectedMissingList}
      />
      <NewMissingListDialog
        open={newMissingDialogOpen}
        onOpenChange={setNewMissingDialogOpen}
        onSuccess={handleRefresh}
      />

      {/* Order Dialogs */}
      <ViewOrderDialog
        open={viewOrderDialogOpen}
        onOpenChange={setViewOrderDialogOpen}
        order={selectedOrder}
      />
      <NewOrderDialog
        open={newOrderDialogOpen}
        onOpenChange={setNewOrderDialogOpen}
        onSuccess={handleRefresh}
      />
      <EditOrderDialog
        open={editOrderDialogOpen}
        onOpenChange={setEditOrderDialogOpen}
        order={selectedOrder}
        onSuccess={handleRefresh}
      />
      <ConvertToInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        order={selectedOrder}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
