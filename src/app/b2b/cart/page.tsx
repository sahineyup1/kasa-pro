'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, B2BSession } from '@/services/b2b-auth';
import { pushData, getData } from '@/services/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Send, Package,
  Loader2, CheckCircle, AlertCircle, ShoppingBag, Sparkles,
  CreditCard, Wallet, Clock, Truck, Gift, Percent, Euro,
  ArrowRight, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { toast } from 'sonner';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  vatRate: number;
}

const CART_KEY = 'b2b_cart';

// Güvenli localStorage
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      console.warn('localStorage okuma hatası');
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      console.warn('localStorage yazma hatası');
    }
  }
};

export default function B2BCartPage() {
  const router = useRouter();
  const [session, setSession] = useState<B2BSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'vadeli' | 'pesin'>('vadeli');
  const [partnerData, setPartnerData] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // İlk yüklemede cart'ı oku
  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    const savedCart = safeStorage.getItem(CART_KEY);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      } catch {}
    }
    setCartLoaded(true);
  }, []);

  // Partner bilgilerini yükle
  useEffect(() => {
    if (!session?.partnerId) return;

    const loadPartner = async () => {
      const data = await getData(`partners/${session.partnerId}`);
      setPartnerData(data);
    };
    loadPartner();
  }, [session?.partnerId]);

  // Cart değiştiğinde localStorage'a kaydet (sadece cart yüklendikten sonra)
  useEffect(() => {
    if (cartLoaded) {
      safeStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    toast.success('Urun sepetten kaldirildi');
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Sepet temizlendi');
  };

  // Hesaplamalar - KDV dahil göster
  const calculations = useMemo(() => {
    const items = cart.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const vatAmount = (lineTotal * item.vatRate) / 100;
      return {
        ...item,
        lineTotal,
        vatAmount,
        lineTotalWithVat: lineTotal + vatAmount,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const vatTotal = items.reduce((sum, i) => sum + i.vatAmount, 0);
    const grandTotal = subtotal + vatTotal;

    // Vade bilgisi
    const paymentTerms = partnerData?.payment?.paymentTermDays || 30;

    return { items, subtotal, vatTotal, grandTotal, paymentTerms };
  }, [cart, partnerData]);

  // Sipariş gönder
  const submitOrder = async () => {
    if (!session) {
      toast.error('Oturum bulunamadi');
      return;
    }

    if (cart.length === 0) {
      toast.error('Sepet bos');
      return;
    }

    setLoading(true);
    setShowConfirmDialog(false);

    try {
      const timestamp = Date.now();
      const newOrderNumber = `B2B-${timestamp}`;

      const orderData = {
        orderNumber: newOrderNumber,
        customerId: session.partnerId,
        customerName: session.partnerName,
        customerEmail: partnerData?.contact?.email || '',
        customerAddress: partnerData?.contact?.address?.street || '',
        customerTaxId: partnerData?.tax?.taxId || partnerData?.financial?.vatNumber || '',
        items: calculations.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
          vatRate: item.vatRate,
          totalPrice: item.lineTotal,
        })),
        subtotal: calculations.subtotal,
        vatAmount: calculations.vatTotal,
        totalAmount: calculations.grandTotal,
        status: 'pending',
        paymentMethod,
        paymentTerms: calculations.paymentTerms,
        notes: notes.trim() || null,
        source: 'b2b_portal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pushData('orders', orderData);

      setOrderNumber(newOrderNumber);
      setOrderSuccess(true);
      setCart([]);
      setNotes('');
      localStorage.removeItem(CART_KEY);
      toast.success('Siparis basariyla olusturuldu!');
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Siparis olusturma hatasi');
    } finally {
      setLoading(false);
    }
  };

  // Sipariş başarılı ekranı
  if (orderSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30"
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            Siparis Olusturuldu!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-4"
          >
            Siparisíniz basariyla alindi. En kisa surede hazirlayacagiz.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8"
          >
            <p className="text-sm text-blue-600 mb-1">Siparis Numarasi</p>
            <p className="text-xl font-bold text-blue-700">{orderNumber}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/b2b/orders">
              <Button variant="outline" className="w-full sm:w-auto">
                Siparislerim
              </Button>
            </Link>
            <Link href="/b2b/products">
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Alisverise Devam
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/b2b/products">
            <Button variant="outline" size="sm" className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Urunlere Don
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sepetim</h1>
            <p className="text-gray-500">{cart.length} urun</p>
          </div>
        </div>

        {cart.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Sepeti Temizle
          </Button>
        )}
      </div>

      {/* Empty State */}
      {cart.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sepetiniz bos</h2>
          <p className="text-gray-500 mb-6">Hemen alisverise baslayin!</p>
          <Link href="/b2b/products">
            <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Urunlere Git
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence mode="popLayout">
              {cart.map((item, index) => {
                const lineTotal = item.quantity * item.unitPrice;
                const vatAmount = (lineTotal * item.vatRate) / 100;

                return (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{item.productName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {item.unitPrice.toFixed(2)} EUR / {item.unit}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-gray-500">
                                KDV %{item.vatRate}
                              </Badge>
                            </div>

                            {/* Mobile Price */}
                            <div className="mt-2 sm:hidden">
                              <p className="text-lg font-bold text-gray-900">
                                {(lineTotal + vatAmount).toFixed(2)} EUR
                              </p>
                              <p className="text-xs text-gray-500">
                                ({lineTotal.toFixed(2)} + {vatAmount.toFixed(2)} KDV)
                              </p>
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - (item.unit === 'KG' ? 0.5 : 1))}
                                className="p-2 hover:bg-gray-100 transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center border-0 font-medium"
                                step={item.unit === 'KG' ? 0.5 : 1}
                                min="0"
                              />
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + (item.unit === 'KG' ? 0.5 : 1))}
                                className="p-2 hover:bg-gray-100 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Desktop Price */}
                            <div className="hidden sm:block text-right">
                              <p className="text-lg font-bold text-gray-900">
                                {(lineTotal + vatAmount).toFixed(2)} EUR
                              </p>
                              <p className="text-xs text-gray-500">
                                KDV dahil
                              </p>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Summary Card */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Siparis Ozeti
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Odeme Yontemi</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethod('vadeli')}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === 'vadeli'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Clock className={`w-5 h-5 ${paymentMethod === 'vadeli' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">Vadeli</span>
                        <span className="text-xs text-gray-500">{calculations.paymentTerms} gun</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('pesin')}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === 'pesin'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Euro className={`w-5 h-5 ${paymentMethod === 'pesin' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">Pesin</span>
                        <span className="text-xs text-gray-500">Hemen</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-gray-700 font-medium">Siparis Notu</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ozel isteklerinizi yazin..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Price Breakdown */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ara Toplam</span>
                      <span className="font-medium">{calculations.subtotal.toFixed(2)} EUR</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">KDV</span>
                      <span className="font-medium">{calculations.vatTotal.toFixed(2)} EUR</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Toplam</span>
                      <span className="text-blue-600">{calculations.grandTotal.toFixed(2)} EUR</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={loading || cart.length === 0}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Gonderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Siparis Ver
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Siparisi vererek kosullari kabul etmis olursunuz
                  </p>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="border-0 shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Hizli Teslimat</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Siparisleriniz en kisa surede hazirlanir
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Siparisi Onayla
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-gray-600">
              Asagidaki siparisi vermek istediginize emin misiniz?
            </p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Urun Sayisi</span>
                <span className="font-medium">{cart.length} urun</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Odeme</span>
                <span className="font-medium">
                  {paymentMethod === 'vadeli' ? `Vadeli (${calculations.paymentTerms} gun)` : 'Pesin'}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Toplam</span>
                <span className="text-blue-600">{calculations.grandTotal.toFixed(2)} EUR</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                Iptal
              </Button>
              <Button
                onClick={submitOrder}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Onayla
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
