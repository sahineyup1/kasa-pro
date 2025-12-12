'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getSession, B2BSession } from '@/services/b2b-auth';
import { getCachedDataArray, getData } from '@/services/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, ShoppingCart, Plus, Minus, Package, X, Loader2, Check, ChevronRight, Grid3X3
} from 'lucide-react';
import { CATEGORIES, getCategoryInfo } from '@/services/categories';
import { t, B2BLanguage, getCategoryNameByLang } from '@/services/b2b-translations';
import { toast } from 'sonner';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  stockCode?: string;
  barcode?: string;
  category?: string;
  unit?: string;
  sellPrice?: number;
  vatRate?: number;
  currentStock?: number;
  imageUrl?: string;
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

interface PartnerData {
  basic?: { customerType?: string };
  b2bLogin?: {
    allowedCategories?: string[];
    discount?: number;
    categoryDiscounts?: Record<string, number>;
    productPrices?: Record<string, { price?: number; discount?: number }>;
    language?: B2BLanguage;
  };
  payment?: { categoryRates?: Record<string, number>; discount?: number };
}

const CART_KEY = 'b2b_cart';
const ITEMS_PER_PAGE = 50;

// localStorage helper
const storage = {
  get: (key: string) => {
    try { return typeof window !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
  },
  set: (key: string, val: string) => {
    try { if (typeof window !== 'undefined') localStorage.setItem(key, val); } catch {}
  }
};

export default function B2BProductsPage() {
  const [session, setSession] = useState<B2BSession | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const listRef = useRef<HTMLDivElement>(null);

  // Load session & cart
  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);
    const savedCart = storage.get(CART_KEY);
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch {}
    }
    setCartLoaded(true);
  }, []);

  // Load partner data
  useEffect(() => {
    if (!session?.partnerId) return;
    getData(`partners/${session.partnerId}`).then(setPartnerData);
  }, [session?.partnerId]);

  // Load products once
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCachedDataArray('products', 15 * 60 * 1000);
        if (data) {
          const list = data
            .filter((p: any) => p.isActive !== false && p.basic?.status !== 'deleted')
            .map((p: any) => ({
              id: p.id || p._id,
              name: p.basic?.name || p.name || '',
              stockCode: p.basic?.stockCode || p.stockCode || '',
              barcode: p.barcodes?.mainBarcode || p.barcode || '',
              category: p.basic?.category || p.category || '',
              unit: p.basic?.unit || p.unit || 'KG',
              sellPrice: p.pricing?.sellPrice || p.sellPrice || 0,
              vatRate: p.pricing?.vatRate || p.vatRate || 22,
              currentStock: p.stock?.totalStock || p.currentStock || 0,
              imageUrl: p.imageUrl || p.basic?.imageUrl || p.images?.mainImageUrl || '',
              targetCustomer: p.basic?.targetCustomer || p.targetCustomer || 'both',
              caseQuantity: p.barcodes?.caseBarcode?.caseQuantity || 1,
            }))
            .filter((p: Product) => p.name && (p.sellPrice || 0) > 0)
            .sort((a: Product, b: Product) => a.name.localeCompare(b.name));
          setAllProducts(list);
        }
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Save cart
  useEffect(() => {
    if (cartLoaded) storage.set(CART_KEY, JSON.stringify(cart));
  }, [cart, cartLoaded]);

  // Partner settings
  const lang = partnerData?.b2bLogin?.language || 'sl';
  const customerType = partnerData?.basic?.customerType || 'market';
  const allowedCategories = partnerData?.b2bLogin?.allowedCategories || [];
  const discountPercent = partnerData?.b2bLogin?.discount || partnerData?.payment?.discount || 0;
  const categoryDiscounts = partnerData?.b2bLogin?.categoryDiscounts || {};
  const productPrices = partnerData?.b2bLogin?.productPrices || {};
  const categoryRates = partnerData?.payment?.categoryRates || {};

  // Check if product is visible for this customer
  const isProductVisible = useCallback((product: Product): boolean => {
    // Customer type check
    const target = product.targetCustomer || 'both';
    if (target !== 'both' && customerType !== 'both' && target !== customerType) {
      return false;
    }

    // Category restriction check
    if (allowedCategories.length > 0) {
      const productCat = product.category || '';
      const mainCat = productCat.includes('.') ? productCat.split('.')[0] : productCat;

      // Check if product's main category OR full category is in allowed list
      const isAllowed = allowedCategories.some(allowed => {
        // Exact match
        if (allowed === productCat) return true;
        // Main category match (e.g., "MEAT" allows "MEAT.BEEF")
        if (allowed === mainCat) return true;
        // Product category starts with allowed (e.g., allowed "MEAT" matches "MEAT.BEEF")
        if (productCat.startsWith(allowed + '.')) return true;
        return false;
      });

      if (!isAllowed) return false;
    }

    return true;
  }, [customerType, allowedCategories]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      // Visibility check (customer type + allowed categories)
      if (!isProductVisible(product)) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(search) ||
          product.stockCode?.toLowerCase().includes(search) ||
          product.barcode?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const productCat = product.category || '';
        const mainCat = productCat.includes('.') ? productCat.split('.')[0] : productCat;
        if (mainCat !== selectedCategory && productCat !== selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }, [allProducts, searchTerm, selectedCategory, isProductVisible]);

  // Category counts for visible products only
  const categoryCounts = useMemo(() => {
    const visibleProducts = allProducts.filter(isProductVisible);
    const counts: Record<string, number> = { all: visibleProducts.length };

    visibleProducts.forEach(p => {
      const cat = p.category || '';
      const mainCat = cat.includes('.') ? cat.split('.')[0] : cat;
      counts[mainCat] = (counts[mainCat] || 0) + 1;
    });

    return counts;
  }, [allProducts, isProductVisible]);

  // Available categories (only those with products)
  const availableCategories = useMemo(() => {
    return CATEGORIES.filter(cat => (categoryCounts[cat.code] || 0) > 0);
  }, [categoryCounts]);

  // Products to display (virtualized)
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredProducts.length));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredProducts.length]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, selectedCategory]);

  // Calculate customer price
  const getCustomerPrice = useCallback((product: Product): number => {
    const basePrice = product.sellPrice || 0;
    const productId = product.id;
    const category = product.category || '';
    const mainCategory = category.includes('.') ? category.split('.')[0] : category;

    // 1) Product special price
    const productSpecial = productPrices[productId];
    if (productSpecial?.price && productSpecial.price > 0) {
      return productSpecial.price;
    }

    let price = basePrice;

    // Legacy category rate
    const categoryRate = categoryRates[category] || categoryRates[mainCategory] || 0;
    if (categoryRate !== 0) {
      price = price * (1 + categoryRate / 100);
    }

    // 2) Product discount
    if (productSpecial?.discount && productSpecial.discount > 0) {
      return price * (1 - productSpecial.discount / 100);
    }

    // 3) Category discount
    const catDiscount = categoryDiscounts[category] || categoryDiscounts[mainCategory] || 0;
    if (catDiscount > 0) {
      return price * (1 - catDiscount / 100);
    }

    // 4) General discount
    if (discountPercent > 0) {
      price = price * (1 - discountPercent / 100);
    }

    return price;
  }, [productPrices, categoryRates, categoryDiscounts, discountPercent]);

  // Add to cart
  const addToCart = useCallback((product: Product, qty: number = 1) => {
    if (qty <= 0) return;
    const customerPrice = getCustomerPrice(product);

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: customerPrice,
        unit: product.unit || 'KG',
        vatRate: product.vatRate || 22,
      }];
    });

    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 1200);
    toast.success(`${product.name} ${t('addedToCart', lang)}`);
  }, [getCustomerPrice, lang]);

  // Update quantity
  const updateQty = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      return { ...prev, [productId]: Math.max(0.5, current + delta) };
    });
  };

  // Cart totals
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const cartCount = cart.length;

  // Get category name
  const getCatName = (code: string) => {
    const cat = CATEGORIES.find(c => c.code === code);
    if (!cat) return code;
    return getCategoryNameByLang(cat, lang);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500">{t('loading', lang)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={listRef}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm pb-4 -mx-4 px-4 pt-2 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('products', lang)}</h1>
            <p className="text-sm text-gray-500">
              {filteredProducts.length} {t('productsCount', lang)}
              {allowedCategories.length > 0 && (
                <span className="text-blue-600 ml-1">
                  ({availableCategories.length} {lang === 'tr' ? 'kategori' : 'kategorij'})
                </span>
              )}
            </p>
          </div>
          <Link href="/b2b/cart">
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg">
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="font-semibold">{cartCount}</span>
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">
                {cartTotal.toFixed(2)}€
              </span>
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder={t('searchProducts', lang)}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 text-base"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5 inline mr-1.5" />
            {t('allCategories', lang)}
            <span className="ml-1.5 text-xs opacity-70">({categoryCounts.all || 0})</span>
          </button>

          {availableCategories.map(cat => {
            const count = categoryCounts[cat.code] || 0;
            const isActive = selectedCategory === cat.code;
            const Icon = cat.icon;

            return (
              <button
                key={cat.code}
                onClick={() => setSelectedCategory(cat.code)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? `${cat.bgColor} ${cat.color} shadow-md ring-2 ring-offset-1 ring-current`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {getCatName(cat.code)}
                <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t('noProductsFound', lang)}</h3>
          <p className="text-gray-500 mt-1">{t('tryDifferentSearch', lang)}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayedProducts.map(product => {
              const customerPrice = getCustomerPrice(product);
              const hasDiscount = customerPrice < (product.sellPrice || 0);
              const discountPct = hasDiscount ? Math.round((1 - customerPrice / (product.sellPrice || 1)) * 100) : 0;
              const isAdded = addedToCart === product.id;
              const qty = quantities[product.id] || 1;
              const catInfo = getCategoryInfo(product.category || '', lang === 'sl' ? 'sl' : 'tr');

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border shadow-sm hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${catInfo.bgColor}`}>
                        {(() => {
                          const CatIcon = catInfo.icon;
                          return CatIcon ? <CatIcon className={`w-12 h-12 ${catInfo.color} opacity-50`} /> : <Package className="w-12 h-12 text-gray-400 opacity-50" />;
                        })()}
                      </div>
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && discountPct > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        -{discountPct}%
                      </div>
                    )}

                    {/* Stock indicator */}
                    <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${
                      (product.currentStock || 0) <= 0 ? 'bg-red-500' :
                      (product.currentStock || 0) < 10 ? 'bg-amber-500' : 'bg-green-500'
                    }`} title={`${product.currentStock || 0} ${product.unit}`} />
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    {/* Name */}
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 min-h-[40px] leading-tight">
                      {product.name}
                    </h3>

                    {/* Price */}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {customerPrice.toFixed(2)}€
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                          {product.sellPrice?.toFixed(2)}€
                        </span>
                      )}
                      <span className="text-xs text-gray-500">/{product.unit}</span>
                    </div>

                    {/* Add to Cart */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                        <button
                          onClick={() => updateQty(product.id, product.unit === 'KG' ? -0.5 : -1)}
                          className="p-1.5 hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 min-w-[32px] text-center text-sm font-medium">
                          {qty.toFixed(product.unit === 'KG' ? 1 : 0)}
                        </span>
                        <button
                          onClick={() => updateQty(product.id, product.unit === 'KG' ? 0.5 : 1)}
                          className="p-1.5 hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Button
                        onClick={() => addToCart(product, qty)}
                        size="sm"
                        className={`flex-1 h-8 text-xs transition-all ${
                          isAdded
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isAdded ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                            {t('addToCart', lang)}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more indicator */}
          {visibleCount < filteredProducts.length && (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">
                {visibleCount} / {filteredProducts.length} {t('productsCount', lang)}
              </p>
            </div>
          )}
        </>
      )}

      {/* Floating Cart (Mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden z-30">
        <Link href="/b2b/cart">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700 shadow-2xl"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
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
