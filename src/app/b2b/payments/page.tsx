'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSession, B2BSession } from '@/services/b2b-auth';
import { subscribeToRTDB, getData, pushData } from '@/services/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CreditCard, TrendingUp, TrendingDown, Wallet, Plus, Search,
  Calendar, Euro, CheckCircle, Clock, XCircle, ArrowUpRight,
  ArrowDownRight, Receipt, Send, Loader2, AlertCircle, RefreshCw,
  Banknote, Building2, CreditCardIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  orderId?: string;
}

interface PartnerData {
  payment?: {
    currentBalance?: number;
    creditLimit?: number;
    paymentTermDays?: number;
  };
  financial?: {
    balance?: number;
    creditLimit?: number;
  };
  balance?: number;
}

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Banka Transferi', icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'cash', label: 'Nakit', icon: Banknote, color: 'text-green-600', bgColor: 'bg-green-50' },
  { id: 'credit_card', label: 'Kredi Karti', icon: CreditCardIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: {
    label: 'Bekliyor',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: Clock
  },
  approved: {
    label: 'Onaylandi',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle
  },
  rejected: {
    label: 'Reddedildi',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle
  },
};

export default function B2BPaymentsPage() {
  const [session, setSession] = useState<B2BSession | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New payment form
  const [newPayment, setNewPayment] = useState({
    amount: '',
    method: 'bank_transfer',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);
  }, []);

  // Load partner data
  useEffect(() => {
    if (!session?.partnerId) return;

    const loadPartnerData = async () => {
      const data = await getData(`partners/${session.partnerId}`);
      setPartnerData(data);
    };

    loadPartnerData();
  }, [session?.partnerId]);

  // Load payments
  useEffect(() => {
    if (!session?.partnerId) return;

    const unsubscribe = subscribeToRTDB('payments', (data) => {
      if (data) {
        const myPayments = data
          .filter((p: any) => p.customerId === session.partnerId)
          .map((p: any) => ({
            id: p.id || p._id,
            amount: p.amount || 0,
            method: p.method || 'cash',
            status: p.status || 'pending',
            reference: p.reference,
            notes: p.notes,
            createdAt: p.createdAt,
            orderId: p.orderId,
          }));

        myPayments.sort((a: Payment, b: Payment) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setPayments(myPayments);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [session?.partnerId]);

  // Balance calculation
  const balance = useMemo(() => {
    return partnerData?.payment?.currentBalance ||
           partnerData?.financial?.balance ||
           partnerData?.balance ||
           0;
  }, [partnerData]);

  const creditLimit = useMemo(() => {
    return partnerData?.payment?.creditLimit ||
           partnerData?.financial?.creditLimit ||
           0;
  }, [partnerData]);

  // Stats
  const stats = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthPayments = payments.filter(
      p => new Date(p.createdAt) >= thisMonth && p.status === 'approved'
    );

    const totalThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingCount = payments.filter(p => p.status === 'pending').length;

    return {
      totalThisMonth,
      pendingCount,
      totalPayments: payments.length,
      approvedPayments: payments.filter(p => p.status === 'approved').length,
    };
  }, [payments]);

  // Filtered payments
  const filteredPayments = payments.filter((payment) => {
    if (searchTerm === '') return true;
    return payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.method.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Submit new payment
  const handleSubmitPayment = async () => {
    if (!session || !newPayment.amount) {
      toast.error('Lutfen tutar girin');
      return;
    }

    const amount = parseFloat(newPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Gecerli bir tutar girin');
      return;
    }

    setSubmitting(true);

    try {
      await pushData('payments', {
        customerId: session.partnerId,
        customerName: session.partnerName,
        amount,
        method: newPayment.method,
        reference: newPayment.reference || null,
        notes: newPayment.notes || null,
        status: 'pending',
        source: 'b2b_portal',
        createdAt: new Date().toISOString(),
      });

      toast.success('Odeme bildirimi gonderildi!');
      setShowNewPaymentDialog(false);
      setNewPayment({ amount: '', method: 'bank_transfer', reference: '', notes: '' });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Odeme bildirimi gonderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodInfo = (methodId: string) => {
    return PAYMENT_METHODS.find(m => m.id === methodId) || PAYMENT_METHODS[0];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-gray-500 animate-pulse">Odemeler yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Hero Card */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className={`p-6 md:p-8 ${balance >= 0 ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700' : 'bg-gradient-to-br from-red-500 via-red-600 to-rose-700'}`}>
          <div className="absolute inset-0 bg-grid opacity-10"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Cari Bakiye</p>
                    <p className="text-3xl md:text-4xl font-bold text-white">
                      {Math.abs(balance).toFixed(2)}
                      <span className="text-lg ml-1">EUR</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/90">
                  {balance >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Alacak</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm">Borc</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[140px]">
                  <p className="text-white/70 text-xs mb-1">Bu Ay</p>
                  <p className="text-xl font-bold text-white">{stats.totalThisMonth.toFixed(2)}</p>
                  <p className="text-white/60 text-xs">EUR odendi</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[140px]">
                  <p className="text-white/70 text-xs mb-1">Kredi Limiti</p>
                  <p className="text-xl font-bold text-white">{creditLimit.toFixed(2)}</p>
                  <p className="text-white/60 text-xs">EUR</p>
                </div>
              </div>
            </div>

            {/* New Payment Button */}
            <Dialog open={showNewPaymentDialog} onOpenChange={setShowNewPaymentDialog}>
              <DialogTrigger asChild>
                <Button
                  className="mt-6 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Odeme Bildirimi Gonder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Odeme Bildirimi</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Tutar (EUR)</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Method */}
                  <div className="space-y-2">
                    <Label>Odeme Yontemi</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setNewPayment({ ...newPayment, method: method.id })}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            newPayment.method === method.id
                              ? `border-blue-500 ${method.bgColor}`
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <method.icon className={`w-5 h-5 ${method.color}`} />
                          <span className="text-xs text-center">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="space-y-2">
                    <Label htmlFor="reference">Referans No (Opsiyonel)</Label>
                    <Input
                      id="reference"
                      placeholder="Dekont/Havale no"
                      value={newPayment.reference}
                      onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ek bilgi..."
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleSubmitPayment}
                    disabled={submitting || !newPayment.amount}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gonderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Bildirim Gonder
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Odeme', value: stats.totalPayments, icon: Receipt, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: 'Onaylanan', value: stats.approvedPayments, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
          { label: 'Bekleyen', value: stats.pendingCount, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
          { label: 'Bu Ay', value: `${stats.totalThisMonth.toFixed(0)}€`, icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Odeme ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Payments List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Odeme Gecmisi</h3>

        <AnimatePresence mode="wait">
          {filteredPayments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Henuz odeme kaydı yok</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {filteredPayments.map((payment, index) => {
                const method = getMethodInfo(payment.method);
                const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                const MethodIcon = method.icon;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Method Icon */}
                          <div className={`w-12 h-12 ${method.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                            <MethodIcon className={`w-6 h-6 ${method.color}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{method.label}</p>
                              <Badge className={`${status.bgColor} ${status.color} border text-xs`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span>{formatDate(payment.createdAt)}</span>
                              {payment.reference && (
                                <span className="truncate">Ref: {payment.reference}</span>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              +{payment.amount.toFixed(2)}
                              <span className="text-sm font-normal text-gray-500 ml-1">EUR</span>
                            </p>
                          </div>
                        </div>

                        {/* Notes */}
                        {payment.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">{payment.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
