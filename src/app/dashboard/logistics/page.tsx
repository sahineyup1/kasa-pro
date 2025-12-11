'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { subscribeToRTDB, updateData } from '@/services/firebase';
import {
  Plus, RefreshCw, MoreHorizontal, Search, Download, Eye, Send, Truck,
  Package, Clock, ShoppingCart, ClipboardList, FileText, CheckCircle,
  ArrowRight, Box
} from 'lucide-react';
import { BulkTransferDialog } from '@/components/dialogs/bulk-transfer-dialog';
import { WaybillReceiveDialog } from '@/components/dialogs/waybill-receive-dialog';

// =================== INTERFACES ===================

interface RequestItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
}

interface StockRequest {
  id: string;
  requestNumber?: string;
  requestDate?: string;
  branchId?: string;
  branchName?: string;
  items?: RequestItem[];
  totalAmount?: number;
  status?: string;
}

interface Order {
  id: string;
  orderNo?: string;
  orderDate?: string;
  customerName?: string;
  customerId?: string;
  items?: RequestItem[];
  total?: number;
  status?: string;
}

interface MissingList {
  id: string;
  listNo?: string;
  branchId?: string;
  branchName?: string;
  items?: RequestItem[];
  status?: string;
  createdAt?: string;
}

interface Transfer {
  id: string;
  transferNumber?: string;
  transferDate?: string;
  fromBranch?: string;
  fromBranchName?: string;
  toBranch?: string;
  toBranchName?: string;
  items?: RequestItem[];
  status?: string;
  createdAt?: string;
  createdByName?: string;
}

interface Waybill {
  id: string;
  waybillNumber?: string;
  relatedTransferId?: string;
  sourceLocation?: { branchName?: string; id?: string };
  targetLocation?: { branchName?: string; id?: string };
  driverName?: string;
  vehicle?: string;
  items?: RequestItem[];
  status?: string;
  createdAt?: string;
  pdfUrl?: string;
}

// Unified incoming item
export interface IncomingItem {
  id: string;
  type: 'request' | 'order' | 'missing';
  number: string;
  date: string;
  source: string;
  sourceId?: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  items: RequestItem[];
  originalData: StockRequest | Order | MissingList;
}

// =================== STATUS BADGES ===================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-800',
    'approved': 'bg-amber-100 text-amber-800',
    'confirmed': 'bg-amber-100 text-amber-800',
    'preparing': 'bg-purple-100 text-purple-800',
    'ready': 'bg-cyan-100 text-cyan-800',
    'sent': 'bg-amber-100 text-amber-800',
    'in_transit': 'bg-cyan-100 text-cyan-800',
    'delivered': 'bg-green-100 text-green-800',
    'completed': 'bg-green-100 text-green-800',
    'draft': 'bg-gray-100 text-gray-800',
    'ready_to_dispatch': 'bg-amber-100 text-amber-800',
    'cancelled': 'bg-red-100 text-red-800',
    'rejected': 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    'pending': 'Beklemede',
    'approved': 'Onaylandi',
    'confirmed': 'Onaylandi',
    'preparing': 'Hazirlaniyor',
    'ready': 'Hazir',
    'sent': 'Gonderildi',
    'in_transit': 'Yolda',
    'delivered': 'Teslim Edildi',
    'completed': 'Tamamlandi',
    'draft': 'Taslak',
    'ready_to_dispatch': 'Sevke Hazir',
    'cancelled': 'Iptal',
    'rejected': 'Reddedildi',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    'request': { icon: <Package className="h-3 w-3 mr-1" />, label: 'Talep', className: 'bg-amber-50 text-amber-700' },
    'order': { icon: <ShoppingCart className="h-3 w-3 mr-1" />, label: 'Siparis', className: 'bg-purple-50 text-purple-700' },
    'missing': { icon: <ClipboardList className="h-3 w-3 mr-1" />, label: 'Eksik Liste', className: 'bg-amber-50 text-amber-700' },
  };

  const c = config[type] || { icon: null, label: type, className: 'bg-gray-50 text-gray-700' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
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
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-amber-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
    amber: 'bg-amber-50',
    purple: 'bg-purple-50',
    gray: 'bg-gray-50',
    cyan: 'bg-cyan-50',
  };

  const iconClasses = {
    blue: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    gray: 'bg-gray-100 text-gray-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  const textClasses = {
    blue: 'text-amber-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    gray: 'text-gray-900',
    cyan: 'text-cyan-600',
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

export default function LogisticsPage() {
  const [activeTab, setActiveTab] = useState('incoming');
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [missingLists, setMissingLists] = useState<MissingList[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Dialog states
  const [bulkTransferDialogOpen, setBulkTransferDialogOpen] = useState(false);
  const [waybillReceiveDialogOpen, setWaybillReceiveDialogOpen] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const [selectedTransferItems, setSelectedTransferItems] = useState<IncomingItem[]>([]);

  // =================== LOAD DATA ===================
  useEffect(() => {
    setLoading(true);

    const unsubRequests = subscribeToRTDB('stock_requests', (data) => {
      const filtered = (data || []).filter((r: StockRequest) =>
        ['pending', 'approved'].includes(r.status || '')
      );
      setStockRequests(filtered);
    });

    const unsubOrders = subscribeToRTDB('orders', (data) => {
      const filtered = (data || []).filter((o: Order) =>
        ['pending', 'confirmed', 'preparing'].includes(o.status || '')
      );
      setOrders(filtered);
    });

    const unsubMissing = subscribeToRTDB('missing_lists', (data) => {
      const filtered = (data || []).filter((m: MissingList) =>
        ['pending', 'sent'].includes(m.status || '')
      );
      setMissingLists(filtered);
    });

    const unsubTransfers = subscribeToRTDB('stock_transfers', (data) => {
      setTransfers(data || []);
    });

    const unsubWaybills = subscribeToRTDB('internal_waybills', (data) => {
      setWaybills(data || []);
      setLoading(false);
    });

    return () => {
      unsubRequests();
      unsubOrders();
      unsubMissing();
      unsubTransfers();
      unsubWaybills();
    };
  }, []);

  // =================== COMBINE INCOMING ITEMS ===================
  const incomingItems = useMemo((): IncomingItem[] => {
    const items: IncomingItem[] = [];

    // Stock Requests
    stockRequests.forEach(r => {
      items.push({
        id: r.id,
        type: 'request',
        number: r.requestNumber || '-',
        date: r.requestDate || '',
        source: r.branchName || '-',
        sourceId: r.branchId,
        itemCount: r.items?.length || 0,
        totalAmount: r.totalAmount || 0,
        status: r.status || 'pending',
        items: r.items || [],
        originalData: r,
      });
    });

    // Orders
    orders.forEach(o => {
      items.push({
        id: o.id,
        type: 'order',
        number: o.orderNo || '-',
        date: o.orderDate || o.id,
        source: o.customerName || '-',
        sourceId: o.customerId,
        itemCount: o.items?.length || 0,
        totalAmount: o.total || 0,
        status: o.status || 'pending',
        items: o.items || [],
        originalData: o,
      });
    });

    // Missing Lists
    missingLists.forEach(m => {
      items.push({
        id: m.id,
        type: 'missing',
        number: m.listNo || '-',
        date: m.createdAt || '',
        source: m.branchName || m.branchId || '-',
        sourceId: m.branchId,
        itemCount: m.items?.length || 0,
        totalAmount: 0,
        status: m.status || 'pending',
        items: m.items || [],
        originalData: m,
      });
    });

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockRequests, orders, missingLists]);

  // =================== FILTERED DATA ===================
  const filteredIncoming = useMemo(() => {
    return incomingItems.filter(item => {
      const matchesSearch = !searchQuery ||
        item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [incomingItems, searchQuery, typeFilter, statusFilter]);

  // Combine transfers with waybills for history
  const historyItems = useMemo(() => {
    return transfers.map(t => {
      const waybill = waybills.find(w => w.relatedTransferId === t.id);
      return { transfer: t, waybill };
    }).sort((a, b) =>
      new Date(b.transfer.createdAt || '').getTime() - new Date(a.transfer.createdAt || '').getTime()
    );
  }, [transfers, waybills]);

  // =================== STATS ===================
  const stats = useMemo(() => ({
    totalRequests: stockRequests.length,
    totalOrders: orders.filter(o => ['pending', 'confirmed'].includes(o.status || '')).length,
    totalPending: incomingItems.filter(i => i.status === 'pending').length,
    inTransit: waybills.filter(w => w.status === 'in_transit').length,
    delivered: waybills.filter(w => w.status === 'delivered').length,
  }), [stockRequests, orders, incomingItems, waybills]);

  // =================== HANDLERS ===================
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredIncoming.map(i => i.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleApproveItem = async (item: IncomingItem) => {
    if (!confirm(`"${item.number}" kalemini onaylamak istediginize emin misiniz?`)) return;

    try {
      const path = item.type === 'request' ? 'stock_requests' :
                   item.type === 'order' ? 'orders' : 'missing_lists';
      await updateData(`${path}/${item.id}`, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'admin',
      });
    } catch (error) {
      console.error('Approve error:', error);
      alert('Onaylama hatasi: ' + (error as Error).message);
    }
  };

  const handleCreateTransfer = () => {
    if (selectedItems.size === 0) {
      alert('Transfer olusturmak icin en az bir kalem seciniz');
      return;
    }

    const items = filteredIncoming.filter(i => selectedItems.has(i.id));
    setSelectedTransferItems(items);
    setBulkTransferDialogOpen(true);
  };

  const handleDispatchWaybill = async (waybill: Waybill) => {
    if (!confirm(`"${waybill.waybillNumber}" irsaliyesini sevk etmek istediginize emin misiniz?`)) return;

    try {
      await updateData(`internal_waybills/${waybill.id}`, {
        status: 'in_transit',
        dispatchedAt: new Date().toISOString(),
        dispatchedBy: 'admin',
      });
    } catch (error) {
      console.error('Dispatch error:', error);
      alert('Sevk hatasi: ' + (error as Error).message);
    }
  };

  const handleReceiveWaybill = (waybill: Waybill) => {
    setSelectedWaybill(waybill);
    setWaybillReceiveDialogOpen(true);
  };

  const handleTransferSuccess = () => {
    setSelectedItems(new Set());
    handleRefresh();
  };

  // =================== RENDER ===================
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Lojistik Merkezi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gelen talepler, transferler ve sevkiyat yonetimi
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="incoming" className="text-xs sm:text-sm">
              <Package className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Gelen</span> Talepler
            </TabsTrigger>
            <TabsTrigger value="transfer" className="text-xs sm:text-sm">
              <Truck className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Transfer</span> Olustur
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 sm:mr-2" />
              Sevkiyat <span className="hidden sm:inline">Gecmisi</span>
            </TabsTrigger>
          </TabsList>

          {/* =================== INCOMING TAB =================== */}
          <TabsContent value="incoming" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Package className="h-5 w-5" />} title="Sube Talepleri" value={stats.totalRequests} color="blue" />
              <StatCard icon={<ShoppingCart className="h-5 w-5" />} title="Musteri Siparisleri" value={stats.totalOrders} color="purple" />
              <StatCard icon={<Clock className="h-5 w-5" />} title="Bekleyen" value={stats.totalPending} color="amber" />
              <StatCard icon={<Truck className="h-5 w-5" />} title="Yolda" value={stats.inTransit} color="cyan" />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="No veya kaynak ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Tip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum tipler</SelectItem>
                    <SelectItem value="request">Sube Talepleri</SelectItem>
                    <SelectItem value="order">Musteri Siparisleri</SelectItem>
                    <SelectItem value="missing">Eksik Listeleri</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum durumlar</SelectItem>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="approved">Onaylandi</SelectItem>
                    <SelectItem value="preparing">Hazirlaniyor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateTransfer}
                disabled={selectedItems.size === 0}
              >
                <Truck className="h-4 w-4 mr-2" />
                Transfer Olustur ({selectedItems.size})
              </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={filteredIncoming.length > 0 && selectedItems.size === filteredIncoming.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead className="text-right">Urun</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Toplam</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : filteredIncoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Gelen talep bulunamadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncoming.slice(0, 50).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell><TypeBadge type={item.type} /></TableCell>
                        <TableCell className="font-mono font-medium">{item.number}</TableCell>
                        <TableCell>{item.date?.split('T')[0] || '-'}</TableCell>
                        <TableCell className="font-medium">{item.source}</TableCell>
                        <TableCell className="text-right">{item.itemCount}</TableCell>
                        <TableCell className="text-right font-medium hidden sm:table-cell">
                          {item.totalAmount > 0 ? `€${item.totalAmount.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Goruntule
                              </DropdownMenuItem>
                              {item.status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleApproveItem(item)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Onayla
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

          {/* =================== TRANSFER TAB =================== */}
          <TabsContent value="transfer" className="space-y-4">
            <div className="bg-white rounded-lg border p-8 text-center">
              <Truck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Transfer Olustur</h3>
              <p className="text-gray-500 mb-4">
                Transfer olusturmak icin Gelen Talepler sekmesinden kalemleri secin ve
                Transfer Olustur butonuna tiklayin.
              </p>
              <Button onClick={() => setActiveTab('incoming')}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Gelen Taleplere Git
              </Button>
            </div>
          </TabsContent>

          {/* =================== HISTORY TAB =================== */}
          <TabsContent value="history" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<FileText className="h-5 w-5" />} title="Toplam Transfer" value={transfers.length} color="blue" />
              <StatCard icon={<Clock className="h-5 w-5" />} title="Taslak" value={waybills.filter(w => w.status === 'draft').length} color="gray" />
              <StatCard icon={<Truck className="h-5 w-5" />} title="Yolda" value={stats.inTransit} color="cyan" />
              <StatCard icon={<CheckCircle className="h-5 w-5" />} title="Teslim Edildi" value={stats.delivered} color="green" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead>Hedef</TableHead>
                    <TableHead className="text-right">Urun</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="hidden lg:table-cell">Olusturan</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Yukleniyor...
                      </TableCell>
                    </TableRow>
                  ) : historyItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Sevkiyat kaydi bulunamadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyItems.slice(0, 50).map(({ transfer, waybill }) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-mono font-medium">{transfer.transferNumber || '-'}</TableCell>
                        <TableCell>{transfer.createdAt?.split('T')[0] || '-'}</TableCell>
                        <TableCell>{transfer.fromBranchName || transfer.fromBranch || 'Merkez'}</TableCell>
                        <TableCell>{transfer.toBranchName || transfer.toBranch || '-'}</TableCell>
                        <TableCell className="text-right">{transfer.items?.length || 0}</TableCell>
                        <TableCell>
                          <StatusBadge status={waybill?.status || transfer.status || 'pending'} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{transfer.createdByName || '-'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Detay
                              </DropdownMenuItem>
                              {waybill && waybill.status === 'ready_to_dispatch' && (
                                <DropdownMenuItem onClick={() => handleDispatchWaybill(waybill)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Sevk Et
                                </DropdownMenuItem>
                              )}
                              {waybill && waybill.status === 'in_transit' && (
                                <DropdownMenuItem onClick={() => handleReceiveWaybill(waybill)}>
                                  <Box className="h-4 w-4 mr-2" />
                                  Teslim Al
                                </DropdownMenuItem>
                              )}
                              {waybill?.pdfUrl && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    PDF Indir
                                  </DropdownMenuItem>
                                </>
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
      <BulkTransferDialog
        open={bulkTransferDialogOpen}
        onOpenChange={setBulkTransferDialogOpen}
        selectedItems={selectedTransferItems}
        onSuccess={handleTransferSuccess}
      />
      <WaybillReceiveDialog
        open={waybillReceiveDialogOpen}
        onOpenChange={setWaybillReceiveDialogOpen}
        waybill={selectedWaybill}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
