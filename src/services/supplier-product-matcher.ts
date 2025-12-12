/**
 * TEDARİKÇİ ÜRÜN EŞLEŞTİRME MOTORU
 * Tedarikçi stok kodları ile sistemdeki ürünleri eşleştirir
 * Desktop kasa ile uyumlu - supplierMappings yapısını kullanır
 */

import { getData, updateData, subscribeToRTDB } from './firebase';

// =================== TYPES ===================

export interface SupplierMapping {
  supplierStockCode: string;
  supplierProductName?: string;
  lastPrice: number;
  lastPriceWithExpense: number;
  lastPurchaseDate: string;
  totalPurchases: number;
}

export interface ProductMatch {
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  barcode?: string;
  lastPrice: number;
  lastPriceWithExpense: number;
  supplierProductName: string;
  lastPurchaseDate: string;
  totalPurchases: number;
}

export interface Product {
  id?: string;
  name?: string;
  stockCode?: string;
  unit?: string;
  barcode?: string;
  basic?: {
    name?: string;
    stockCode?: string;
  };
  barcodes?: {
    mainBarcode?: string;
  };
  supplierMappings?: Record<string, SupplierMapping>;
  lastPurchasePrice?: number;
  lastPurchaseDate?: string;
}

// =================== SUPPLIER PRODUCT MATCHER ===================

class SupplierProductMatcher {
  private cache: Record<string, Record<string, ProductMatch>> = {};
  private reverseCache: Record<string, Record<string, string>> = {};
  private products: Record<string, Product> = {};
  private productsLoaded: boolean = false;

  /**
   * Tüm ürünleri yükle
   */
  async loadProducts(forceReload: boolean = false): Promise<void> {
    if (this.productsLoaded && !forceReload) {
      return;
    }

    try {
      console.log('🔄 Ürünler yükleniyor...');
      const data = await getData('products');

      if (data) {
        // Object veya array olabilir
        if (Array.isArray(data)) {
          this.products = {};
          data.forEach((p: any, index: number) => {
            const id = p.id || p._id || `product_${index}`;
            this.products[id] = { ...p, id };
          });
        } else {
          this.products = {};
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            this.products[key] = { ...value, id: key };
          });
        }
      }

      this.productsLoaded = true;
      console.log(`✅ ${Object.keys(this.products).length} ürün yüklendi`);
    } catch (error) {
      console.error('❌ Ürün yükleme hatası:', error);
    }
  }

  /**
   * Tedarikçinin tüm ürün eşleştirmelerini yükle
   * Desktop kasa ile uyumlu - iki farklı yapıyı destekler:
   * 1. product.supplierMappings[supplierId]
   * 2. product.supplier (tek tedarikçi)
   * 3. partners[supplierId].products[code] (tedarikçi üzerinde)
   */
  async loadSupplierMappings(supplierId: string, forceReload: boolean = false): Promise<number> {
    if (!forceReload && this.cache[supplierId]) {
      console.log(`✅ Cache'den yüklendi: ${supplierId}`);
      return Object.keys(this.cache[supplierId]).length;
    }

    console.log(`🔄 ${supplierId} için eşleştirmeler yükleniyor...`);

    // Ürünler yüklü değilse yükle
    await this.loadProducts(forceReload);

    const mappings: Record<string, ProductMatch> = {};

    // Yöntem 1: Ürünlerdeki supplierMappings
    for (const [prodId, product] of Object.entries(this.products)) {
      const supplierMap = product.supplierMappings || {};

      if (supplierMap[supplierId]) {
        const mappingData = supplierMap[supplierId];
        const supplierCode = (mappingData.supplierStockCode || '').trim().toUpperCase();

        if (supplierCode) {
          this.addToMappings(mappings, supplierCode, prodId, product, mappingData, supplierId);
        }
      }
    }

    // Yöntem 2: Ürünlerdeki tek supplier alanı
    for (const [prodId, product] of Object.entries(this.products)) {
      const supplierInfo = (product as any).supplier;
      if (supplierInfo && typeof supplierInfo === 'object') {
        const productSupplierId = supplierInfo.supplierId;
        const supplierSKU = (supplierInfo.supplierSKU || '').trim().toUpperCase();

        // Bu tedarikçiye ait mi?
        if (productSupplierId === supplierId && supplierSKU && !mappings[supplierSKU]) {
          this.addToMappings(mappings, supplierSKU, prodId, product, {
            supplierStockCode: supplierSKU,
            supplierProductName: supplierInfo.supplierProductName || '',
            lastPrice: supplierInfo.lastPurchasePrice || 0,
            lastPriceWithExpense: supplierInfo.lastPurchasePrice || 0,
            lastPurchaseDate: supplierInfo.lastPurchaseDate || '',
            totalPurchases: 0,
          }, supplierId);
        }
      }
    }

    // Yöntem 3: Tedarikçi üzerindeki products listesi
    try {
      const partnerData = await getData(`partners/${supplierId}`);
      if (partnerData?.products) {
        for (const [code, prodInfo] of Object.entries(partnerData.products as Record<string, any>)) {
          const supplierCode = code.trim().toUpperCase();
          const linkedProductId = prodInfo.linkedProduct;

          if (linkedProductId && !mappings[supplierCode]) {
            const product = this.products[linkedProductId];
            if (product) {
              this.addToMappings(mappings, supplierCode, linkedProductId, product, {
                supplierStockCode: supplierCode,
                supplierProductName: prodInfo.name || '',
                lastPrice: prodInfo.lastPrice || prodInfo.price || 0,
                lastPriceWithExpense: prodInfo.lastPrice || prodInfo.price || 0,
                lastPurchaseDate: prodInfo.lastPurchaseDate || '',
                totalPurchases: prodInfo.totalPurchases || 0,
              }, supplierId);
            }
          }
        }
      }
    } catch (error) {
      console.log('Partner products yüklenemedi:', error);
    }

    this.cache[supplierId] = mappings;
    console.log(`✅ ${Object.keys(mappings).length} ürün eşleşmesi yüklendi (${supplierId})`);

    return Object.keys(mappings).length;
  }

  // Helper: Mapping ekle
  private addToMappings(
    mappings: Record<string, ProductMatch>,
    supplierCode: string,
    prodId: string,
    product: Product,
    mappingData: SupplierMapping,
    supplierId: string
  ): void {
    const productName = product.basic?.name || product.name || '';
    const productCode = product.basic?.stockCode || product.stockCode || '';
    const barcode = product.barcodes?.mainBarcode || product.barcode || '';

    mappings[supplierCode] = {
      productId: prodId,
      productName,
      productCode,
      unit: product.unit || 'KG',
      barcode,
      lastPrice: mappingData.lastPrice || 0,
      lastPriceWithExpense: mappingData.lastPriceWithExpense || 0,
      supplierProductName: mappingData.supplierProductName || '',
      lastPurchaseDate: mappingData.lastPurchaseDate || '',
      totalPurchases: mappingData.totalPurchases || 0,
    };

    // Reverse mapping
    if (!this.reverseCache[prodId]) {
      this.reverseCache[prodId] = {};
    }
    this.reverseCache[prodId][supplierId] = supplierCode;
  }

  /**
   * Tedarikçi koduna göre ürün ara
   */
  async search(supplierId: string, supplierCode: string): Promise<ProductMatch | null> {
    // Cache yoksa yükle
    if (!this.cache[supplierId]) {
      await this.loadSupplierMappings(supplierId);
    }

    // Kodu normalize et
    const code = supplierCode.trim().toUpperCase();

    // Cache'de ara
    const result = this.cache[supplierId]?.[code] || null;

    if (result) {
      console.log(`✅ Eşleşme bulundu: ${code} → ${result.productName}`);
    } else {
      console.log(`⚠️ Eşleşme bulunamadı: ${code}`);
    }

    return result;
  }

  /**
   * Bizim stok koduna göre ürün ara (Excel'de "Bizim Sifra" kolonu için)
   */
  async searchByOurCode(stockCode: string): Promise<Product | null> {
    await this.loadProducts();

    const code = stockCode.trim().toUpperCase();

    for (const [prodId, product] of Object.entries(this.products)) {
      const productCode = (product.basic?.stockCode || product.stockCode || '').toUpperCase();
      if (productCode === code) {
        console.log(`✅ Bizim kodla bulundu: ${code} → ${product.basic?.name || product.name}`);
        return { ...product, id: prodId };
      }
    }

    console.log(`⚠️ Bizim kodla bulunamadı: ${code}`);
    return null;
  }

  /**
   * Barkoda göre ürün ara
   */
  async searchByBarcode(barcode: string): Promise<Product | null> {
    await this.loadProducts();

    const code = barcode.trim();

    for (const [prodId, product] of Object.entries(this.products)) {
      const mainBarcode = product.barcodes?.mainBarcode || product.barcode || '';
      if (mainBarcode === code) {
        console.log(`✅ Barkodla bulundu: ${code} → ${product.basic?.name || product.name}`);
        return { ...product, id: prodId };
      }
    }

    console.log(`⚠️ Barkodla bulunamadı: ${code}`);
    return null;
  }

  /**
   * Ürün adına göre benzer eşleşmeleri ara
   */
  async searchByProductName(supplierId: string, productName: string): Promise<ProductMatch[]> {
    if (!this.cache[supplierId]) {
      await this.loadSupplierMappings(supplierId);
    }

    const searchTerm = productName.toLowerCase().trim();
    const results: ProductMatch[] = [];

    for (const product of Object.values(this.cache[supplierId] || {})) {
      if (
        product.productName.toLowerCase().includes(searchTerm) ||
        product.supplierProductName.toLowerCase().includes(searchTerm)
      ) {
        results.push(product);
      }
    }

    console.log(`🔍 '${productName}' için ${results.length} benzer ürün bulundu`);
    return results;
  }

  /**
   * Yeni eşleştirme ekle veya güncelle
   */
  async addMapping(
    productId: string,
    supplierId: string,
    supplierCode: string,
    supplierProductName: string = ''
  ): Promise<boolean> {
    try {
      console.log(`💾 Yeni eşleştirme kaydediliyor...`);
      console.log(`   Ürün ID: ${productId}`);
      console.log(`   Tedarikçi: ${supplierId}`);
      console.log(`   Kod: ${supplierCode}`);

      // Ürünü al
      await this.loadProducts();
      const product = this.products[productId];

      if (!product) {
        console.log(`❌ Ürün bulunamadı: ${productId}`);
        return false;
      }

      // supplierMappings yapısı yoksa oluştur
      const supplierMappings = product.supplierMappings || {};

      // Eşleştirmeyi ekle/güncelle
      supplierMappings[supplierId] = {
        supplierStockCode: supplierCode.trim().toUpperCase(),
        supplierProductName,
        lastPrice: 0,
        lastPriceWithExpense: 0,
        lastPurchaseDate: new Date().toISOString(),
        totalPurchases: 0,
      };

      // Firebase'e kaydet
      await updateData(`products/${productId}`, { supplierMappings });

      // Local cache güncelle
      this.products[productId].supplierMappings = supplierMappings;

      // Mapping cache güncelle
      if (this.cache[supplierId]) {
        const codeUpper = supplierCode.trim().toUpperCase();
        this.cache[supplierId][codeUpper] = {
          productId,
          productName: product.basic?.name || product.name || '',
          productCode: product.basic?.stockCode || product.stockCode || '',
          unit: product.unit || 'KG',
          barcode: product.barcodes?.mainBarcode || product.barcode || '',
          lastPrice: 0,
          lastPriceWithExpense: 0,
          supplierProductName,
          lastPurchaseDate: new Date().toISOString(),
          totalPurchases: 0,
        };
      }

      // Reverse cache güncelle
      if (!this.reverseCache[productId]) {
        this.reverseCache[productId] = {};
      }
      this.reverseCache[productId][supplierId] = supplierCode.trim().toUpperCase();

      console.log(`✅ Eşleştirme kaydedildi: ${supplierCode} → ${product.basic?.name || product.name}`);
      return true;
    } catch (error) {
      console.error('❌ Eşleştirme kayıt hatası:', error);
      return false;
    }
  }

  /**
   * Son alış fiyatını güncelle
   */
  async updateLastPurchase(
    productId: string,
    supplierId: string,
    price: number,
    priceWithExpense: number
  ): Promise<boolean> {
    try {
      await this.loadProducts();
      const product = this.products[productId];

      if (!product) {
        console.log(`❌ Ürün bulunamadı: ${productId}`);
        return false;
      }

      const supplierMappings = product.supplierMappings || {};

      if (!supplierMappings[supplierId]) {
        console.log(`⚠️ Tedarikçi eşleştirmesi bulunamadı`);
        return false;
      }

      // Fiyatları güncelle
      supplierMappings[supplierId].lastPrice = price;
      supplierMappings[supplierId].lastPriceWithExpense = priceWithExpense;
      supplierMappings[supplierId].lastPurchaseDate = new Date().toISOString();
      supplierMappings[supplierId].totalPurchases = (supplierMappings[supplierId].totalPurchases || 0) + 1;

      // Firebase'e kaydet
      await updateData(`products/${productId}`, {
        supplierMappings,
        lastPurchasePrice: priceWithExpense,
        lastPurchaseDate: new Date().toISOString(),
      });

      // Local cache güncelle
      this.products[productId].supplierMappings = supplierMappings;
      this.products[productId].lastPurchasePrice = priceWithExpense;
      this.products[productId].lastPurchaseDate = new Date().toISOString();

      // Mapping cache güncelle
      const code = this.reverseCache[productId]?.[supplierId];
      if (code && this.cache[supplierId]?.[code]) {
        this.cache[supplierId][code].lastPrice = price;
        this.cache[supplierId][code].lastPriceWithExpense = priceWithExpense;
        this.cache[supplierId][code].lastPurchaseDate = new Date().toISOString();
        this.cache[supplierId][code].totalPurchases += 1;
      }

      console.log(`✅ Son alış fiyatı güncellendi: ${priceWithExpense.toFixed(2)}€`);
      return true;
    } catch (error) {
      console.error('❌ Fiyat güncelleme hatası:', error);
      return false;
    }
  }

  /**
   * Ürün ID'sine göre tedarikçi stok kodunu al
   */
  getSupplierCode(productId: string, supplierId: string): string | null {
    return this.reverseCache[productId]?.[supplierId] || null;
  }

  /**
   * Tedarikçinin tüm eşleştirmelerini al
   */
  async getAllMappings(supplierId: string): Promise<Record<string, ProductMatch>> {
    if (!this.cache[supplierId]) {
      await this.loadSupplierMappings(supplierId);
    }
    return this.cache[supplierId] || {};
  }

  /**
   * Son alış fiyatını getir (fiyat karşılaştırması için)
   */
  async getLastPrice(supplierId: string, supplierCode: string): Promise<{ price: number; priceWithExpense: number; date: string } | null> {
    const match = await this.search(supplierId, supplierCode);
    if (match && match.lastPrice > 0) {
      return {
        price: match.lastPrice,
        priceWithExpense: match.lastPriceWithExpense,
        date: match.lastPurchaseDate,
      };
    }
    return null;
  }

  /**
   * Fiyat değişim yüzdesini hesapla
   */
  calculatePriceChange(oldPrice: number, newPrice: number): { change: number; percent: number; direction: 'up' | 'down' | 'same' } {
    if (oldPrice === 0) {
      return { change: 0, percent: 0, direction: 'same' };
    }

    const change = newPrice - oldPrice;
    const percent = (change / oldPrice) * 100;

    return {
      change,
      percent,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
    };
  }

  /**
   * Cache'i temizle
   */
  clearCache(supplierId?: string): void {
    if (supplierId) {
      delete this.cache[supplierId];
      console.log(`🗑️ ${supplierId} cache'i temizlendi`);
    } else {
      this.cache = {};
      this.reverseCache = {};
      this.products = {};
      this.productsLoaded = false;
      console.log('🗑️ Tüm cache temizlendi');
    }
  }
}

// Global instance
export const supplierMatcher = new SupplierProductMatcher();
export default supplierMatcher;
