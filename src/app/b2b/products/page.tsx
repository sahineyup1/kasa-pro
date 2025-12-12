'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSession, B2BSession } from '@/services/b2b-auth';
import { subscribeToRTDB, getData } from '@/services/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, ShoppingCart, Plus, Minus, Package, Grid, List, X,
  Filter, ChevronDown, Loader2, ZoomIn, AlertCircle, Check
} from 'lucide-react';
import {
  CATEGORIES,
  getB2BCategoryList,
  getCategoryInfo,
  matchesCategory as matchesCategoryFilter,
} from '@/services/categories';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  stockCode?: string;
  barcode?: string;
  category?: string;
  subCategory?: string;
  unit?: string;
  sellPrice?: number;
  vatRate?: number;
  currentStock?: number;
  minStock?: number;
  imageUrl?: string;
  isActive?: boolean;
  targetCustomer?: string;
  caseQuantity?: number;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  vatRate: number;
}

// Slovence kategori listesi (merkezi servis'ten)
const B2B_CATEGORIES = getB2BCategoryList('sl');

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

interface PartnerData {
  payment?: {
    categoryRates?: Record<string, number>;
    discount?: number; // Genel iskonto yüzdesi
  };
  basic?: {
    customerType?: string;
  };
  b2bLogin?: {
    allowedCategories?: string[]; // İzin verilen kategoriler
    discount?: number; // B2B özel iskonto
  };
  categoryRates?: Record<string, number>;
  customerType?: string;
}

export default function B2BProductsPage() {
  const [session, setSession] = useState<B2BSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);

  // Session ve cart yükle
  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    const savedCart = safeStorage.getItem(CART_KEY);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      } catch {}
    }
    setCartLoaded(true);
  }, []);

  // Partner bilgilerini yükle (kategori fiyatları ve müşteri tipi için)
  useEffect(() => {
    if (!session?.partnerId) return;

    const loadPartner = async () => {
      const data = await getData(`partners/${session.partnerId}`);
      setPartnerData(data);
    };
    loadPartner();
  }, [session?.partnerId]);

  // Ürünleri yükle
  useEffect(() => {
    const unsubscribe = subscribeToRTDB('products', (data) => {
      if (data) {
        const productList = data
          .filter((p: any) => p.isActive !== false && p.basic?.status !== 'deleted')
          .map((p: any) => ({
            id: p.id || p._id,
            name: p.basic?.name || p.name || '',
            stockCode: p.basic?.stockCode || p.stockCode || '',
            barcode: p.barcodes?.mainBarcode || p.barcode || '',
            category: p.basic?.category || p.category || '',
            subCategory: p.basic?.subCategory || p.subCategory || '',
            unit: p.basic?.unit || p.unit || 'KG',
            sellPrice: p.pricing?.sellPrice || p.sellPrice || 0,
            vatRate: p.pricing?.vatRate || p.vatRate || 22,
            currentStock: p.stock?.totalStock || p.currentStock || 0,
            minStock: p.stock?.minStock || p.minStock || 0,
            imageUrl: p.imageUrl || p.basic?.imageUrl || p.images?.mainImageUrl || '',
            isActive: p.isActive !== false,
            targetCustomer: p.basic?.targetCustomer || p.targetCustomer || 'both',
            caseQuantity: p.barcodes?.caseBarcode?.caseQuantity || 1,
          }))
          .filter((p: Product) => p.name && (p.sellPrice || 0) > 0);

        productList.sort((a: Product, b: Product) => a.name.localeCompare(b.name));
        setProducts(productList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Cart'ı kaydet (sadece yüklendikten sonra)
  useEffect(() => {
    if (cartLoaded) {
      safeStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  // Müşteri tipi
  const customerType = useMemo(() => {
    return partnerData?.basic?.customerType || partnerData?.customerType || 'market';
  }, [partnerData]);

  // İzin verilen kategoriler (boş ise tüm kategoriler izinli)
  const allowedCategories = useMemo(() => {
    return partnerData?.b2bLogin?.allowedCategories || [];
  }, [partnerData]);

  // Genel iskonto yüzdesi
  const discountPercent = useMemo(() => {
    // Önce b2bLogin'deki iskonto, sonra payment'taki
    return partnerData?.b2bLogin?.discount || partnerData?.payment?.discount || 0;
  }, [partnerData]);

  // Kategori bazlı fiyat oranları
  const categoryRates = useMemo(() => {
    return partnerData?.payment?.categoryRates || partnerData?.categoryRates || {};
  }, [partnerData]);

  // Müşteriye özel fiyat hesapla (iskonto ile)
  const getCustomerPrice = (product: Product): number => {
    const basePrice = product.sellPrice || 0;
    const category = product.category || 'OTHER_ITEMS';
    const categoryRate = categoryRates[category] || 0;

    // Önce kategori oranını uygula
    let price = basePrice * (1 + categoryRate / 100);

    // Sonra genel iskontoyu uygula
    if (discountPercent > 0) {
      price = price * (1 - discountPercent / 100);
    }

    return price;
  };

  // Orijinal fiyatı al (iskonto göstermek için)
  const getOriginalPrice = (product: Product): number => {
    return product.sellPrice || 0;
  };

  // Müşteri tipine ve kategoriye göre ürün görünür mü?
  const isProductVisibleForCustomer = (product: Product): boolean => {
    // Müşteri tipi kontrolü
    const target = product.targetCustomer || 'both';
    if (target !== 'both' && customerType !== 'both' && target !== customerType) {
      return false;
    }

    // İzin verilen kategori kontrolü
    if (allowedCategories.length > 0) {
      const productCategory = product.category || 'OTHER_ITEMS';
      if (!allowedCategories.includes(productCategory)) {
        return false;
      }
    }

    return true;
  };

  // Kategori sayıları - ana kategorilere göre grupla
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => {
      const cat = p.category || 'OTHER';
      // Ana kategori sayısı
      const mainCat = cat.includes('.') ? cat.split('.')[0] : cat;
      counts[mainCat] = (counts[mainCat] || 0) + 1;
      // Alt kategori sayısı
      if (cat.includes('.')) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Filtrelenmiş ürünler
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Müşteri tipine göre filtrele
      if (!isProductVisibleForCustomer(product)) return false;

      const matchesSearch =
        searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.stockCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());

      // Merkezi kategori eşleştirme
      const categoryMatches = matchesCategoryFilter(product.category || '', selectedCategory);

      return matchesSearch && categoryMatches;
    });
  }, [products, searchTerm, selectedCategory, customerType]);

  // Sepete ekle
  const addToCart = (product: Product, quantity: number = 1) => {
    if (quantity <= 0) {
      toast.error('Vnesite veljavno količino');
      return;
    }

    // Müşteriye özel fiyat kullan
    const customerPrice = getCustomerPrice(product);

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice: customerPrice,
          unit: product.unit || 'KG',
          vatRate: product.vatRate || 22,
        },
      ];
    });

    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 1500);
    toast.success(`${product.name} dodano v košarico`);
  };

  // Miktar güncelle
  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const newQty = Math.max(0.5, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  // Sepet toplamı
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const cartCount = cart.length;

  // Stok durumu badge (Slovence)
  const getStockBadge = (product: Product) => {
    const stock = product.currentStock || 0;
    const minStock = product.minStock || 0;

    if (stock <= 0) {
      return { label: 'Ni na zalogi', color: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (stock <= minStock) {
      return { label: 'Malo zaloge', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'Na zalogi', color: 'bg-green-100 text-green-700 border-green-200' };
  };

  // Kategori bilgisi al (Slovence)
  const getCatInfo = (categoryId: string) => {
    const info = getCategoryInfo(categoryId, 'sl');
    return {
      name: info.displayName,
      icon: info.icon,
      color: info.color,
      bgColor: info.bgColor,
    };
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
        <p className="mt-4 text-gray-500 animate-pulse">Nalaganje izdelkov...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Izdelki</h1>
          <p className="text-gray-500 mt-1">{filteredProducts.length} izdelkov</p>
        </div>

        {/* Cart Button */}
        <Link href="/b2b/cart">
          <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25">
            <ShoppingCart className="w-4 h-4 mr-2" />
            <span className="font-semibold">Košarica ({cartCount})</span>
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
              {cartTotal.toFixed(2)} EUR
            </span>
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Išči izdelek, kodo ali črtno kodo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle & View Mode */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-12 ${showFilters ? 'bg-blue-50 border-blue-200' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtriraj
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>

          <div className="flex border rounded-xl overflow-hidden h-12">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-sm font-medium text-gray-700 mb-3">Kategorije</p>
              <div className="flex flex-wrap gap-2">
                {/* Tüm ürünler */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-gray-100 text-gray-700 border-current'
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span className="font-medium">Vsi izdelki</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    selectedCategory === 'all' ? 'bg-white/50' : 'bg-gray-100'
                  }`}>
                    {categoryCounts.all || 0}
                  </span>
                </button>

                {/* Ana kategoriler */}
                {CATEGORIES.map((cat) => {
                  const count = categoryCounts[cat.code] || 0;
                  if (count === 0) return null;

                  const isActive = selectedCategory === cat.code || selectedCategory.startsWith(cat.code + '.');
                  const Icon = cat.icon;

                  return (
                    <button
                      key={cat.code}
                      onClick={() => setSelectedCategory(cat.code)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                        isActive
                          ? `${cat.bgColor} ${cat.color} border-current`
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{cat.nameSL}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/50' : 'bg-gray-100'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Badge */}
      {selectedCategory !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Aktivni filter:</span>
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-gray-200"
            onClick={() => setSelectedCategory('all')}
          >
            {getCatInfo(selectedCategory).name}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        </div>
      )}

      {/* Products */}
      <AnimatePresence mode="wait">
        {filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Izdelek ni najden</h3>
            <p className="text-gray-500">Poskusite z drugim iskanjem ali filtrom</p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredProducts.map((product, index) => {
              const stockBadge = getStockBadge(product);
              const catInfo = getCatInfo(product.category || 'OTHER');
              const CatIcon = catInfo.icon;
              const isAdded = addedToCart === product.id;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 shadow-sm">
                    {/* Image */}
                    <div
                      className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center cursor-pointer overflow-hidden"
                      onClick={() => product.imageUrl && setZoomProduct(product)}
                    >
                      {product.imageUrl ? (
                        <>
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                          </div>
                        </>
                      ) : (
                        <div className={`w-20 h-20 ${catInfo.bgColor} rounded-2xl flex items-center justify-center`}>
                          <CatIcon className={`w-10 h-10 ${catInfo.color}`} />
                        </div>
                      )}

                      {/* Stock Badge */}
                      <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium border ${stockBadge.color}`}>
                        {stockBadge.label}
                      </div>

                      {/* Category Badge */}
                      <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${catInfo.bgColor} ${catInfo.color}`}>
                        {catInfo.name}
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* Name */}
                      <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[48px] group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>

                      {/* Code */}
                      {product.stockCode && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          {product.stockCode}
                        </p>
                      )}

                      {/* Price */}
                      {(() => {
                        const customerPrice = getCustomerPrice(product);
                        const hasDiscount = customerPrice !== product.sellPrice;
                        const discountPercent = ((product.sellPrice! - customerPrice) / product.sellPrice!) * 100;

                        return (
                          <div className="mt-3 flex items-end justify-between">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">
                                {customerPrice.toFixed(2)}
                                <span className="text-sm font-normal text-gray-500 ml-1">EUR</span>
                              </p>
                              {hasDiscount && discountPercent > 0 && (
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-400 line-through">{product.sellPrice?.toFixed(2)}</p>
                                  <span className="text-xs text-green-600 font-medium">-%{discountPercent.toFixed(0)}</span>
                                </div>
                              )}
                              {hasDiscount && discountPercent < 0 && (
                                <p className="text-xs text-gray-400 line-through">{product.sellPrice?.toFixed(2)}</p>
                              )}
                              <p className="text-xs text-gray-500">/ {product.unit}</p>
                            </div>

                            {product.caseQuantity && product.caseQuantity > 1 && (
                              <div className="px-2 py-1 bg-blue-50 rounded-lg">
                                <p className="text-xs text-blue-600 font-medium">
                                  Koli: {product.caseQuantity}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Add to Cart */}
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => updateQuantity(product.id, product.unit === 'KG' ? -0.5 : -1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 min-w-[50px] text-center font-medium">
                            {(quantities[product.id] || 1).toFixed(product.unit === 'KG' ? 1 : 0)}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, product.unit === 'KG' ? 0.5 : 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <Button
                          onClick={() => addToCart(product, quantities[product.id] || 1)}
                          className={`flex-1 transition-all ${
                            isAdded
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          size="sm"
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Dodano
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Dodaj
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* List View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {filteredProducts.map((product, index) => {
              const stockBadge = getStockBadge(product);
              const catInfo = getCatInfo(product.category || 'OTHER');
              const CatIcon = catInfo.icon;
              const isAdded = addedToCart === product.id;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="hover:shadow-lg transition-all border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Image */}
                        <div
                          className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden"
                          onClick={() => product.imageUrl && setZoomProduct(product)}
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover hover:scale-110 transition-transform"
                            />
                          ) : (
                            <CatIcon className={`w-8 h-8 ${catInfo.color}`} />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                            <Badge className={`${stockBadge.color} border text-xs`}>
                              {stockBadge.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={`${catInfo.bgColor} ${catInfo.color} text-xs`}>
                              <CatIcon className="w-3 h-3 mr-1" />
                              {catInfo.name}
                            </Badge>
                            {product.stockCode && (
                              <span className="text-xs text-gray-500 font-mono">{product.stockCode}</span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right hidden sm:block">
                          {(() => {
                            const customerPrice = getCustomerPrice(product);
                            const hasDiscount = customerPrice !== product.sellPrice;
                            const discountPercent = ((product.sellPrice! - customerPrice) / product.sellPrice!) * 100;

                            return (
                              <>
                                <p className="text-xl font-bold text-gray-900">
                                  {customerPrice.toFixed(2)}
                                  <span className="text-sm font-normal text-gray-500 ml-1">EUR</span>
                                </p>
                                {hasDiscount && discountPercent > 0 && (
                                  <p className="text-xs text-green-600 font-medium">-%{discountPercent.toFixed(0)}</p>
                                )}
                                <p className="text-xs text-gray-500">/ {product.unit}</p>
                              </>
                            );
                          })()}
                        </div>

                        {/* Add to Cart */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => updateQuantity(product.id, product.unit === 'KG' ? -0.5 : -1)}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-2 min-w-[40px] text-center font-medium text-sm">
                              {(quantities[product.id] || 1).toFixed(product.unit === 'KG' ? 1 : 0)}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, product.unit === 'KG' ? 0.5 : 1)}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <Button
                            onClick={() => addToCart(product, quantities[product.id] || 1)}
                            className={`transition-all ${
                              isAdded ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            size="sm"
                          >
                            {isAdded ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                          </Button>
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

      {/* Image Zoom Dialog */}
      <Dialog open={!!zoomProduct} onOpenChange={() => setZoomProduct(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90">
          {zoomProduct && (
            <div className="relative">
              <img
                src={zoomProduct.imageUrl}
                alt={zoomProduct.name}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-semibold text-lg">{zoomProduct.name}</h3>
                <p className="text-white/70 text-sm">{zoomProduct.stockCode}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Cart Button (Mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Link href="/b2b/cart">
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700 shadow-2xl shadow-green-500/30"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
          </Button>
        </Link>
      </div>
    </div>
  );
}
