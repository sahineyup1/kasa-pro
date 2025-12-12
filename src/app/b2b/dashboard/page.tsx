'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSession, B2BSession } from '@/services/b2b-auth';
import { getData, subscribeToRTDB } from '@/services/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package, ShoppingCart, FileText, CreditCard, TrendingUp, TrendingDown,
  Clock, CheckCircle, Truck, AlertCircle, ArrowRight, Sparkles, Zap,
  Calendar, Euro, ChevronRight, Bell, Star, Target, BarChart3, Activity,
  Loader2, ShoppingBag, Wallet, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: any[];
}

interface MonthlyData {
  month: string;
  total: number;
}

export default function B2BDashboardPage() {
  const [session, setSession] = useState<B2BSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    if (currentSession) {
      loadPartnerData(currentSession.partnerId);
    }
  }, []);

  const loadPartnerData = async (partnerId: string) => {
    try {
      const partner = await getData(`partners/${partnerId}`);
      setPartnerData(partner);
    } catch (error) {
      console.error('Partner load error:', error);
    }
  };

  // Subscribe to orders
  useEffect(() => {
    if (!session?.partnerId) return;

    const unsubscribe = subscribeToRTDB('orders', (data) => {
      if (data) {
        const myOrders = data
          .filter((o: any) => o.customerId === session.partnerId)
          .map((o: any) => ({
            id: o.id || o._id,
            orderNumber: o.orderNumber || o.id,
            status: o.status || 'pending',
            totalAmount: o.totalAmount || 0,
            createdAt: o.createdAt,
            items: o.items || [],
          }));

        myOrders.sort((a: Order, b: Order) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setOrders(myOrders);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [session?.partnerId]);

  // Stats calculation
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    let pendingOrders = 0;
    let activeOrders = 0;
    let completedOrders = 0;

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const orderMonth = orderDate.getMonth();
      const orderYear = orderDate.getFullYear();

      if (orderMonth === thisMonth && orderYear === thisYear) {
        thisMonthTotal += order.totalAmount;
      }
      if (orderMonth === lastMonth && orderYear === lastMonthYear) {
        lastMonthTotal += order.totalAmount;
      }

      if (order.status === 'pending') pendingOrders++;
      if (['approved', 'preparing', 'prepared', 'onDelivery'].includes(order.status)) activeOrders++;
      if (['delivered', 'completed'].includes(order.status)) completedOrders++;
    });

    const balance = partnerData?.payment?.currentBalance ||
                   partnerData?.financial?.balance ||
                   partnerData?.balance || 0;

    const creditLimit = partnerData?.payment?.creditLimit ||
                       partnerData?.financial?.creditLimit || 0;

    const trend = lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    return {
      balance,
      creditLimit,
      totalOrders: orders.length,
      pendingOrders,
      activeOrders,
      completedOrders,
      thisMonthTotal,
      lastMonthTotal,
      trend,
    };
  }, [orders, partnerData]);

  // Monthly chart data (last 6 months)
  const chartData = useMemo(() => {
    const months: MonthlyData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('tr-TR', { month: 'short' });

      const total = orders
        .filter((o) => {
          const od = new Date(o.createdAt);
          return od.getMonth() === date.getMonth() && od.getFullYear() === date.getFullYear();
        })
        .reduce((sum, o) => sum + o.totalAmount, 0);

      months.push({ month: monthName, total });
    }

    return months;
  }, [orders]);

  const maxChartValue = Math.max(...chartData.map(d => d.total), 1);

  // Recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
      pending: { label: 'Bekliyor', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock },
      approved: { label: 'Onaylandi', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: CheckCircle },
      preparing: { label: 'Hazirlaniyor', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Package },
      onDelivery: { label: 'Yolda', color: 'text-cyan-600', bgColor: 'bg-cyan-50', icon: Truck },
      delivered: { label: 'Teslim', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
      completed: { label: 'Tamamlandi', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Gunaydin';
    if (hour < 18) return 'Iyi Gunler';
    return 'Iyi Aksamlar';
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
        <p className="mt-4 text-gray-500 animate-pulse">Dashboard yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-grid opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-blue-200 text-sm">{getGreeting()}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {session?.partnerName}
            </h1>
            <p className="text-blue-100">
              Siparis portaliniza hosgeldiniz
            </p>
          </div>

          <Link href="/b2b/products">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-xl">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Alisverise Basla
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`border-0 shadow-lg overflow-hidden ${stats.balance >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50' : 'bg-gradient-to-br from-red-50 to-rose-50'}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Cari Bakiye</p>
                  <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {Math.abs(stats.balance).toFixed(2)}
                    <span className="text-sm ml-1">EUR</span>
                  </p>
                  <p className={`text-xs mt-1 ${stats.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stats.balance >= 0 ? 'Alacak' : 'Borc'}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.balance >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {stats.balance >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* This Month */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Bu Ay</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.thisMonthTotal.toFixed(0)}
                    <span className="text-sm ml-1">EUR</span>
                  </p>
                  {stats.trend !== 0 && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${stats.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stats.trend).toFixed(0)}%
                    </div>
                  )}
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={`border-0 shadow-lg ${stats.pendingOrders > 0 ? 'bg-gradient-to-br from-amber-50 to-orange-50' : 'bg-white'}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Bekleyen</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                  <p className="text-xs text-gray-500 mt-1">siparis</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.pendingOrders > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                  <Clock className={`w-5 h-5 ${stats.pendingOrders > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Toplam</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalOrders}</p>
                  <p className="text-xs text-gray-500 mt-1">siparis</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Aylik Satis Trendi
                </CardTitle>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600">
                  Son 6 Ay
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between h-48 gap-2 pt-4">
                {chartData.map((data, index) => (
                  <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.total / maxChartValue) * 100}%` }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg min-h-[4px] relative group cursor-pointer"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {data.total.toFixed(0)} EUR
                      </div>
                    </motion.div>
                    <span className="text-xs text-gray-500">{data.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-lg h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Hizli Erisim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: '/b2b/products', icon: Package, label: 'Urunler', desc: 'Katalog', color: 'blue' },
                { href: '/b2b/cart', icon: ShoppingCart, label: 'Sepet', desc: 'Siparis ver', color: 'green' },
                { href: '/b2b/orders', icon: FileText, label: 'Siparisler', desc: 'Takip et', color: 'purple' },
                { href: '/b2b/payments', icon: Wallet, label: 'Odemeler', desc: 'Gecmis', color: 'orange' },
              ].map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <Link href={item.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                      <div className={`w-10 h-10 rounded-xl bg-${item.color}-50 flex items-center justify-center`}>
                        <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Son Siparisler
            </CardTitle>
            <Link href="/b2b/orders">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                Tumunu Gor
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">Henuz siparis yok</p>
                <Link href="/b2b/products">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Ilk Siparisini Ver
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order, index) => {
                  const statusConfig = getStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                    >
                      <Link href="/b2b/orders">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center`}>
                              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">#{order.orderNumber}</p>
                              <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{order.totalAmount.toFixed(2)} EUR</p>
                              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Credit Info */}
      {stats.creditLimit > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kredi Limiti</p>
                    <p className="text-xl font-bold text-gray-900">{stats.creditLimit.toFixed(2)} EUR</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Kullanilan</p>
                  <p className="text-xl font-bold text-gray-900">
                    {Math.max(0, stats.balance * -1).toFixed(2)} EUR
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (Math.max(0, stats.balance * -1) / stats.creditLimit) * 100)}%` }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  %{((Math.max(0, stats.balance * -1) / stats.creditLimit) * 100).toFixed(0)} kullanildi
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
