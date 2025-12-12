'use client';

import { useState, useEffect } from 'react';
import { getSession, B2BSession } from '@/services/b2b-auth';
import { getCachedDataArray } from '@/services/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search, FileText, Package, Clock, CheckCircle, Truck, XCircle,
  ChevronRight, Calendar, Euro, ExternalLink, Filter, ArrowUpDown,
  Eye, Download, RefreshCw, AlertCircle, Loader2, X, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  status: string;
  totalAmount: number;
  subtotal?: number;
  vatAmount?: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  paymentMethod?: string;
  deliveryPdf?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: {
    label: 'Bekliyor',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: Clock
  },
  approved: {
    label: 'Onaylandi',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: CheckCircle
  },
  preparing: {
    label: 'Hazirlaniyor',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: Package
  },
  prepared: {
    label: 'Hazirlandi',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    icon: CheckCircle
  },
  onDelivery: {
    label: 'Yolda',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
    icon: Truck
  },
  delivered: {
    label: 'Teslim Edildi',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle
  },
  completed: {
    label: 'Tamamlandi',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Iptal',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle
  },
};

const TABS = [
  { id: 'all', label: 'Tumu', icon: FileText },
  { id: 'pending', label: 'Bekleyen', icon: Clock },
  { id: 'active', label: 'Aktif', icon: Package },
  { id: 'completed', label: 'Tamamlanan', icon: CheckCircle },
];

export default function B2BOrdersPage() {
  const [session, setSession] = useState<B2BSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);
  }, []);

  // ONE-TIME FETCH - Firebase maliyetini düşürür (5 dakika cache)
  useEffect(() => {
    if (!session?.partnerId) return;

    const loadOrders = async () => {
      try {
        const data = await getCachedDataArray('orders');
        if (data) {
          const myOrders = data
            .filter((o: any) => o.customerId === session.partnerId)
            .map((o: any) => ({
              id: o.id || o._id,
              orderNumber: o.orderNumber || o.invoiceNumber || o.id,
              invoiceNumber: o.invoiceNumber,
              status: o.status || 'pending',
              totalAmount: o.totalAmount || 0,
              subtotal: o.subtotal || 0,
              vatAmount: o.vatAmount || 0,
              items: o.items || [],
              createdAt: o.createdAt,
              updatedAt: o.updatedAt,
              notes: o.notes,
              paymentMethod: o.paymentMethod,
              deliveryPdf: o.deliveryPdf,
            }));

          // Sort by date desc
          myOrders.sort((a: Order, b: Order) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setOrders(myOrders);
        }
      } catch (error) {
        console.error('B2B Orders load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [session?.partnerId]);

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    // Search filter
    const matchesSearch =
      searchTerm === '' ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    // Tab filter
    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = order.status === 'pending';
    } else if (activeTab === 'active') {
      matchesTab = ['approved', 'preparing', 'prepared', 'onDelivery'].includes(order.status);
    } else if (activeTab === 'completed') {
      matchesTab = ['delivered', 'completed'].includes(order.status);
    }

    return matchesSearch && matchesTab;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'date') {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    } else {
      const diff = a.totalAmount - b.totalAmount;
      return sortOrder === 'desc' ? -diff : diff;
    }
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    active: orders.filter(o => ['approved', 'preparing', 'prepared', 'onDelivery'].includes(o.status)).length,
    completed: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const openPdf = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-gray-500 animate-pulse">Siparisler yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header with Glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 md:p-8">
        <div className="absolute inset-0 bg-grid opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Siparislerim</h1>
              <p className="text-blue-100 mt-1">Tum siparislerinizi buradan takip edebilirsiniz</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Toplam', value: stats.total, color: 'bg-white/20' },
              { label: 'Bekleyen', value: stats.pending, color: 'bg-amber-500/30' },
              { label: 'Aktif', value: stats.active, color: 'bg-purple-500/30' },
              { label: 'Tamamlanan', value: stats.completed, color: 'bg-emerald-500/30' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${stat.color} backdrop-blur-sm rounded-xl p-4 border border-white/10`}
              >
                <p className="text-white/70 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto w-full md:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'pending' && stats.pending > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Siparis ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-200"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (sortBy === 'date') {
                setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
              } else {
                setSortBy('date');
                setSortOrder('desc');
              }
            }}
            className="shrink-0"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <AnimatePresence mode="wait">
        {sortedOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Siparis Bulunamadi</h3>
            <p className="text-gray-500">
              {activeTab !== 'all'
                ? 'Bu kategoride siparis yok'
                : 'Henuz siparis vermediniz'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {sortedOrders.map((order, index) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 ${
                      order.status === 'pending' ? 'border-l-amber-500' :
                      order.status === 'completed' || order.status === 'delivered' ? 'border-l-green-500' :
                      order.status === 'cancelled' ? 'border-l-red-500' :
                      'border-l-blue-500'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-5">
                        {/* Order Icon */}
                        <div className={`hidden md:flex w-12 h-12 rounded-xl ${status.bgColor} items-center justify-center shrink-0`}>
                          <StatusIcon className={`w-6 h-6 ${status.color}`} />
                        </div>

                        {/* Order Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">
                                  #{order.orderNumber}
                                </h3>
                                <Badge className={`${status.bgColor} ${status.color} border`}>
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDateShort(order.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5" />
                                  {order.items.length} urun
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              {order.totalAmount.toFixed(2)}
                              <span className="text-sm font-normal text-gray-500 ml-1">EUR</span>
                            </p>
                            {order.paymentMethod && (
                              <p className="text-xs text-gray-500 capitalize">
                                {order.paymentMethod === 'vadeli' ? 'Vadeli' : order.paymentMethod}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {order.deliveryPdf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPdf(order.deliveryPdf!);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl">
                    Siparis #{selectedOrder.orderNumber}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status Card */}
                {(() => {
                  const status = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div className={`flex items-center gap-4 p-4 rounded-xl ${status.bgColor} border`}>
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <StatusIcon className={`w-6 h-6 ${status.color}`} />
                      </div>
                      <div>
                        <p className={`font-semibold ${status.color}`}>{status.label}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(selectedOrder.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Urunler</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity} {item.unit || 'adet'} × {item.unitPrice.toFixed(2)} EUR
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {item.totalPrice.toFixed(2)} EUR
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  {selectedOrder.subtotal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ara Toplam</span>
                      <span>{selectedOrder.subtotal.toFixed(2)} EUR</span>
                    </div>
                  )}
                  {selectedOrder.vatAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">KDV</span>
                      <span>{selectedOrder.vatAmount.toFixed(2)} EUR</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Toplam</span>
                    <span className="text-blue-600">{selectedOrder.totalAmount.toFixed(2)} EUR</span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-1">Siparis Notu</p>
                    <p className="text-sm text-amber-700">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {selectedOrder.deliveryPdf && (
                    <Button
                      onClick={() => openPdf(selectedOrder.deliveryPdf!)}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Faturayi Gor
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1"
                  >
                    Kapat
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
