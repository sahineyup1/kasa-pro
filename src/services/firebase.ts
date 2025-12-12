import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set, push, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';
import {
  initializeFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  Timestamp,
  memoryLocalCache
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log config
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
  databaseURL: firebaseConfig.databaseURL || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
});

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// Firestore - IndexedDB yerine memory cache kullan (storage erişim hatalarını önler)
let firestore: ReturnType<typeof initializeFirestore>;
try {
  firestore = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
} catch (e) {
  // Firestore zaten initialize edilmişse getFirestore kullan
  const { getFirestore } = require('firebase/firestore');
  firestore = getFirestore(app);
}

console.log('Firebase initialized, database:', database ? 'OK' : 'FAILED');
console.log('Firestore initialized:', firestore ? 'OK' : 'FAILED');

// ERP Path prefix - tum veriler erp/ altinda (Realtime DB)
const ERP_PATH = 'erp';
const erpPath = (path: string) => `${ERP_PATH}/${path}`;

// Firestore collection prefix (Desktop app ile uyumlu)
const FIRESTORE_PREFIX = 'erp_';

// Database helper functions
export const dbRef = (path: string) => ref(database, erpPath(path));

export const getData = async (path: string) => {
  const fullPath = erpPath(path);
  console.log('getData:', fullPath);
  const snapshot = await get(ref(database, fullPath));
  return snapshot.exists() ? snapshot.val() : null;
};

export const setData = async (path: string, data: any) => {
  const fullPath = erpPath(path);
  await set(ref(database, fullPath), data);
};

export const pushData = async (path: string, data: any) => {
  const fullPath = erpPath(path);
  const newRef = push(ref(database, fullPath));
  await set(newRef, data);
  return newRef.key;
};

export const updateData = async (path: string, data: any) => {
  const fullPath = erpPath(path);
  await update(ref(database, fullPath), data);
};

export const removeData = async (path: string) => {
  const fullPath = erpPath(path);
  await remove(ref(database, fullPath));
};

export const subscribeToData = (path: string, callback: (data: any) => void) => {
  const fullPath = erpPath(path);
  console.log('Subscribing to RTDB:', fullPath);
  const unsubscribe = onValue(
    ref(database, fullPath),
    (snapshot) => {
      console.log(`RTDB data received for ${fullPath}:`, snapshot.exists() ? 'has data' : 'empty');
      callback(snapshot.exists() ? snapshot.val() : null);
    },
    (error) => {
      console.error(`RTDB error for ${fullPath}:`, error);
      callback(null);
    }
  );
  return unsubscribe;
};

// RTDB'den array formatında veri çek (dict -> array dönüşümü)
export const subscribeToRTDB = (
  path: string,
  callback: (data: any[]) => void
) => {
  const fullPath = erpPath(path);
  console.log('Subscribing to RTDB (array):', fullPath);

  const unsubscribe = onValue(
    ref(database, fullPath),
    (snapshot) => {
      if (!snapshot.exists()) {
        console.log(`RTDB empty for ${fullPath}`);
        callback([]);
        return;
      }

      const rawData = snapshot.val();

      // Dict -> Array dönüşümü
      let arrayData: any[] = [];
      if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
        arrayData = Object.entries(rawData).map(([key, value]: [string, any]) => ({
          id: key,
          _id: key,
          ...value
        }));
      } else if (Array.isArray(rawData)) {
        arrayData = rawData.map((item, index) => ({
          id: item?.id || index.toString(),
          ...item
        }));
      }

      console.log(`RTDB data received for ${fullPath}:`, arrayData.length, 'items');
      callback(arrayData);
    },
    (error) => {
      console.error(`RTDB error for ${fullPath}:`, error);
      callback([]);
    }
  );

  return unsubscribe;
};

// =================== ONE-TIME FETCH (COST OPTIMIZED) ===================

// RTDB'den tek seferlik array veri çek - SUBSCRIPTION YERINE BUNU KULLAN
export const getDataArray = async (path: string): Promise<any[]> => {
  const fullPath = erpPath(path);
  try {
    const snapshot = await get(ref(database, fullPath));
    if (!snapshot.exists()) return [];

    const rawData = snapshot.val();
    let arrayData: any[] = [];

    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      arrayData = Object.entries(rawData).map(([key, value]: [string, any]) => ({
        id: key,
        _id: key,
        ...value
      }));
    } else if (Array.isArray(rawData)) {
      arrayData = rawData.map((item, index) => ({
        id: item?.id || index.toString(),
        ...item
      }));
    }

    return arrayData;
  } catch (error) {
    console.error(`getDataArray error for ${path}:`, error);
    return [];
  }
};

// Firestore'dan tek seferlik veri çek (array) - SUBSCRIPTION YERINE BUNU KULLAN
export const getFirestoreCollection = async (
  collectionName: string,
  options?: {
    limitCount?: number;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
  }
): Promise<any[]> => {
  try {
    const col = getCollection(collectionName);
    const constraints: any[] = [];

    if (options?.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
    }

    if (options?.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = constraints.length > 0 ? firestoreQuery(col, ...constraints) : col;
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`getFirestoreCollection error for ${collectionName}:`, error);
    return [];
  }
};

// =================== CACHE SYSTEM ===================

interface CacheEntry {
  data: any;
  timestamp: number;
}

const dataCache: Map<string, CacheEntry> = new Map();
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

// Cache'li RTDB veri çek
export const getCachedDataArray = async (
  path: string,
  cacheDuration: number = DEFAULT_CACHE_DURATION
): Promise<any[]> => {
  const cacheKey = `rtdb:${path}`;
  const cached = dataCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data;
  }

  const data = await getDataArray(path);
  dataCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

// Cache'li Firestore veri çek
export const getCachedFirestoreCollection = async (
  collectionName: string,
  cacheDuration: number = DEFAULT_CACHE_DURATION,
  options?: {
    limitCount?: number;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
  }
): Promise<any[]> => {
  const cacheKey = `firestore:${collectionName}:${JSON.stringify(options || {})}`;
  const cached = dataCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data;
  }

  const data = await getFirestoreCollection(collectionName, options);
  dataCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

// Cache temizle
export const clearCache = (prefix?: string) => {
  if (prefix) {
    for (const key of dataCache.keys()) {
      if (key.startsWith(prefix)) {
        dataCache.delete(key);
      }
    }
  } else {
    dataCache.clear();
  }
};

// Belirli bir cache'i invalidate et
export const invalidateCache = (path: string, type: 'rtdb' | 'firestore' = 'rtdb') => {
  const cacheKey = `${type}:${path}`;
  for (const key of dataCache.keys()) {
    if (key.startsWith(cacheKey)) {
      dataCache.delete(key);
    }
  }
};

// =================== FIRESTORE HELPERS ===================

// Collection name'i normalize et (Desktop app ile uyumlu)
const normalizeCollectionName = (name: string): string => {
  // Zaten prefix varsa dokunma
  if (name.startsWith(FIRESTORE_PREFIX)) return name;

  // camelCase -> snake_case
  const snakeCase = name.replace(/([A-Z])/g, '_$1').toLowerCase();
  return `${FIRESTORE_PREFIX}${snakeCase}`;
};

// Firestore collection referansı al
export const getCollection = (collectionName: string) => {
  const normalized = normalizeCollectionName(collectionName);
  console.log('Getting Firestore collection:', normalized);
  return collection(firestore, normalized);
};

// Firestore'dan veri dinle (real-time)
export const subscribeToFirestore = (
  collectionName: string,
  callback: (data: any[]) => void,
  constraints?: {
    whereField?: string;
    whereOp?: '==' | '!=' | '<' | '<=' | '>' | '>=';
    whereValue?: any;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
    limitCount?: number;
  }
) => {
  const col = getCollection(collectionName);

  // Query oluştur
  let q: any = col;
  const queryConstraints: any[] = [];

  if (constraints?.whereField && constraints?.whereOp && constraints?.whereValue !== undefined) {
    queryConstraints.push(where(constraints.whereField, constraints.whereOp, constraints.whereValue));
  }

  if (constraints?.orderByField) {
    queryConstraints.push(orderBy(constraints.orderByField, constraints.orderDirection || 'desc'));
  }

  if (constraints?.limitCount) {
    queryConstraints.push(limit(constraints.limitCount));
  }

  if (queryConstraints.length > 0) {
    q = firestoreQuery(col, ...queryConstraints);
  }

  console.log('Subscribing to Firestore collection:', collectionName);

  const unsubscribe = onSnapshot(
    q,
    (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        _id: doc.id,
        ...doc.data()
      }));
      console.log(`Firestore data received for ${collectionName}:`, data.length, 'documents');
      callback(data);
    },
    (error: any) => {
      console.error(`Firestore error for ${collectionName}:`, error);
      callback([]);
    }
  );

  return unsubscribe;
};

// Firestore'dan tek seferlik veri al
export const getFirestoreData = async (collectionName: string, docId?: string) => {
  const normalized = normalizeCollectionName(collectionName);

  if (docId) {
    const docRef = doc(firestore, normalized, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  const col = collection(firestore, normalized);
  const snapshot = await getDocs(col);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Firestore'a veri ekle
export const addFirestoreData = async (collectionName: string, data: any) => {
  const col = getCollection(collectionName);
  const docRef = await addDoc(col, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

// Firestore'da veri güncelle
export const updateFirestoreData = async (collectionName: string, docId: string, data: any) => {
  const normalized = normalizeCollectionName(collectionName);
  const docRef = doc(firestore, normalized, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

// Firestore'dan veri sil
export const deleteFirestoreData = async (collectionName: string, docId: string) => {
  const normalized = normalizeCollectionName(collectionName);
  const docRef = doc(firestore, normalized, docId);
  await deleteDoc(docRef);
};

// =================== COMPANY DATA (erp/company/ path) ===================

// Subscribe to company data (branches, settings, etc.) - under erp/ prefix
export const subscribeToCompanyData = (
  path: string,
  callback: (data: any) => void
) => {
  // Python kasa uses erp/company/branches path
  const fullPath = `erp/company/${path}`;
  console.log('Subscribing to Company data:', fullPath);

  const unsubscribe = onValue(
    ref(database, fullPath),
    (snapshot) => {
      if (!snapshot.exists()) {
        console.log(`Company data empty for ${fullPath}`);
        callback(null);
        return;
      }
      const rawData = snapshot.val();
      console.log(`Company data received for ${fullPath}:`, rawData ? Object.keys(rawData) : 'null');
      callback(rawData);
    },
    (error) => {
      console.error(`Company data error for ${fullPath}:`, error);
      callback(null);
    }
  );

  return unsubscribe;
};

// Get company branches with treasury data
export const subscribeToBranches = (
  callback: (branches: any[]) => void
) => {
  return subscribeToCompanyData('branches', (data) => {
    if (!data) {
      console.log('Branches: No data received');
      callback([]);
      return;
    }

    // Dict -> Array dönüşümü
    let branches: any[] = [];

    if (Array.isArray(data)) {
      // Zaten array ise
      branches = data.map((item, index) => ({
        id: item?.id || `branch_${index}`,
        _id: item?.id || `branch_${index}`,
        ...item
      }));
    } else if (typeof data === 'object') {
      // Object ise dict -> array
      branches = Object.entries(data).map(([key, value]: [string, any]) => ({
        id: key,
        _id: key,
        ...value
      }));
    }

    console.log('Branches loaded:', branches.length, branches.map(b => b.name || b.id));
    // Debug: İlk şubenin yapısını göster
    if (branches.length > 0) {
      console.log('First branch structure:', JSON.stringify(branches[0], null, 2));
    }
    callback(branches);
  });
};

// =================== SKT LOGS (Flutter ile uyumlu - prefix yok) ===================

// Flutter'daki sktLogs koleksiyonuna erişim (prefix olmadan)
export const getSktLogsCollection = (mainBarcode: string) => {
  return collection(firestore, 'sktLogs', mainBarcode, 'lots');
};

// Ürünün lot listesini getir
export const getProductLots = async (mainBarcode: string) => {
  try {
    const lotsCol = collection(firestore, 'sktLogs', mainBarcode, 'lots');
    const snapshot = await getDocs(lotsCol);
    const lots = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // SKT'ye göre sırala (FIFO)
    lots.sort((a: any, b: any) => {
      const dateA = parseExpiryDate(a.expiryDate);
      const dateB = parseExpiryDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });
    return lots;
  } catch (error) {
    console.error('getProductLots error:', error);
    return [];
  }
};

// SKT tarihini parse et (GG.AA.YYYY formatı)
const parseExpiryDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(2100, 0, 1);
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date(dateStr);
};

// Yeni lot ekle (alış faturasından)
export const addProductLot = async (
  mainBarcode: string,
  productName: string,
  expiryDate: string,
  quantity: number,
  userId: string,
  invoiceNo?: string,
  supplierId?: string
) => {
  try {
    // Ana dokümanı oluştur/güncelle
    const docRef = doc(firestore, 'sktLogs', mainBarcode);
    await updateDoc(docRef, {
      barcode: mainBarcode,
      productName: productName,
      updatedAt: new Date().toISOString(),
    }).catch(async () => {
      // Doküman yoksa oluştur
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, {
        barcode: mainBarcode,
        productName: productName,
        createdAt: new Date().toISOString(),
      });
    });

    // Lot sayısını al ve yeni lot ID oluştur
    const lotsCol = collection(firestore, 'sktLogs', mainBarcode, 'lots');
    const lotsSnap = await getDocs(lotsCol);
    const lotId = `lot${lotsSnap.docs.length + 1}`;

    // Yeni lot ekle
    const lotRef = doc(lotsCol, lotId);
    const { setDoc } = await import('firebase/firestore');
    await setDoc(lotRef, {
      lotNumber: lotId,
      mainBarcode: mainBarcode,
      expiryDate: expiryDate,
      quantity: quantity,
      createdAt: new Date().toISOString(),
      userId: userId,
      productName: productName,
      source: 'purchase_invoice',
      invoiceNo: invoiceNo || null,
      supplierId: supplierId || null,
    });

    console.log(`✅ Lot eklendi: ${mainBarcode} → ${lotId}`);
    return lotId;
  } catch (error) {
    console.error('addProductLot error:', error);
    throw error;
  }
};

// Lot miktarını güncelle (satış veya düzeltme için)
export const updateLotQuantity = async (
  mainBarcode: string,
  lotId: string,
  newQuantity: number
) => {
  try {
    const lotRef = doc(firestore, 'sktLogs', mainBarcode, 'lots', lotId);
    await updateDoc(lotRef, {
      quantity: newQuantity,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Lot güncellendi: ${mainBarcode}/${lotId} → ${newQuantity}`);
  } catch (error) {
    console.error('updateLotQuantity error:', error);
    throw error;
  }
};

// Ürünün toplam lot stokunu hesapla
export const getProductLotStock = async (mainBarcode: string): Promise<number> => {
  const lots = await getProductLots(mainBarcode);
  return lots.reduce((sum: number, lot: any) => sum + (lot.quantity || 0), 0);
};

// SKT Logs koleksiyonunu dinle (real-time)
export const subscribeToProductLots = (
  mainBarcode: string,
  callback: (lots: any[]) => void
) => {
  const lotsCol = collection(firestore, 'sktLogs', mainBarcode, 'lots');

  return onSnapshot(lotsCol, (snapshot) => {
    const lots = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // SKT'ye göre sırala (FIFO)
    lots.sort((a: any, b: any) => {
      const dateA = parseExpiryDate(a.expiryDate);
      const dateB = parseExpiryDate(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });
    callback(lots);
  }, (error) => {
    console.error('subscribeToProductLots error:', error);
    callback([]);
  });
};

// =================== OPTIMIZED PRODUCTS SERVICE ===================

// Ürün cache - tüm ürünler bir kez yüklenip cache'lenir
let allProductsCache: { data: any[]; timestamp: number } | null = null;
const PRODUCTS_CACHE_DURATION = 10 * 60 * 1000; // 10 dakika

// Tüm ürünleri yükle (cache'li) - sadece bir kez Firebase'den çeker
export const getAllProductsCached = async (): Promise<any[]> => {
  // Cache kontrolü
  if (allProductsCache && Date.now() - allProductsCache.timestamp < PRODUCTS_CACHE_DURATION) {
    console.log('Products from cache:', allProductsCache.data.length);
    return allProductsCache.data;
  }

  console.log('Loading all products from Firebase...');
  try {
    // Önce Firestore'dan dene
    const col = getCollection('products');
    const snapshot = await getDocs(col);

    let products: any[] = [];

    if (snapshot.docs.length > 0) {
      products = snapshot.docs.map(doc => ({
        id: doc.id,
        _id: doc.id,
        ...doc.data()
      }));
    } else {
      // Firestore boşsa RTDB'den dene
      const rtdbData = await getDataArray('products');
      products = rtdbData;
    }

    // Cache'e kaydet
    allProductsCache = { data: products, timestamp: Date.now() };
    console.log('Products loaded and cached:', products.length);

    return products;
  } catch (error) {
    console.error('getAllProductsCached error:', error);
    return [];
  }
};

// Cache'i temizle (ürün eklendiğinde/güncellendiğinde çağrılmalı)
export const invalidateProductsCache = () => {
  allProductsCache = null;
  console.log('Products cache invalidated');
};

// Ürünleri filtrele ve sayfalı getir (cache'den)
export const getProductsFiltered = async (options: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'stock' | 'price';
  sortDir?: 'asc' | 'desc';
}): Promise<{
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const {
    page = 0,
    pageSize = 50,
    search = '',
    category = 'all',
    sortBy = 'name',
    sortDir = 'asc'
  } = options;

  // Cache'den tüm ürünleri al
  const allProducts = await getAllProductsCached();

  // Filtreleme
  let filtered = allProducts.filter((p: any) => {
    // Aktif kontrolü
    const isActive = p.audit?.isActive ?? p.isActive ?? true;
    if (!isActive) return false;

    // Arama filtresi
    if (search && search.length >= 2) {
      const searchLower = search.toLowerCase();
      const name = (p.basic?.name || p.name || '').toLowerCase();
      const barcode = (p.barcodes?.mainBarcode || p.barcode || '').toLowerCase();
      const sku = (p.basic?.sku || p.sku || '').toLowerCase();

      if (!name.includes(searchLower) &&
          !barcode.includes(searchLower) &&
          !sku.includes(searchLower)) {
        return false;
      }
    }

    // Kategori filtresi
    if (category && category !== 'all') {
      const productCategory = p.basic?.category || p.category || '';
      if (!productCategory.startsWith(category)) {
        return false;
      }
    }

    return true;
  });

  // Sıralama
  filtered.sort((a: any, b: any) => {
    let valA: any, valB: any;

    switch (sortBy) {
      case 'name':
        valA = (a.basic?.name || a.name || '').toLowerCase();
        valB = (b.basic?.name || b.name || '').toLowerCase();
        break;
      case 'stock':
        valA = a.stock?.totalStock ?? a.stock_qty ?? 0;
        valB = b.stock?.totalStock ?? b.stock_qty ?? 0;
        break;
      case 'price':
        valA = a.pricing?.sellPrice ?? a.price ?? 0;
        valB = b.pricing?.sellPrice ?? b.price ?? 0;
        break;
      default:
        valA = (a.basic?.name || a.name || '').toLowerCase();
        valB = (b.basic?.name || b.name || '').toLowerCase();
    }

    if (sortDir === 'asc') {
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    } else {
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    }
  });

  // Sayfalama
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages
  };
};

// Ürün istatistikleri (cache'den hesapla)
export const getProductStats = async (): Promise<{
  total: number;
  active: number;
  lowStock: number;
  totalValue: number;
}> => {
  const allProducts = await getAllProductsCached();

  let total = 0;
  let active = 0;
  let lowStock = 0;
  let totalValue = 0;

  allProducts.forEach((p: any) => {
    total++;

    const isActive = p.audit?.isActive ?? p.isActive ?? true;
    if (isActive) active++;

    const stock = p.stock?.totalStock ?? p.stock_qty ?? 0;
    if (stock < 10 && stock >= 0) lowStock++;

    const cost = p.pricing?.baseCost ?? p.cost ?? 0;
    totalValue += stock * cost;
  });

  return { total, active, lowStock, totalValue };
};

// Barkod ile ürün bul (hızlı lookup)
export const findProductByBarcode = async (barcode: string): Promise<any | null> => {
  if (!barcode) return null;

  const allProducts = await getAllProductsCached();
  const found = allProducts.find((p: any) => {
    const mainBarcode = p.barcodes?.mainBarcode || p.barcode || '';
    const caseBarcode = p.barcodes?.caseBarcode?.barcode || '';
    return mainBarcode === barcode || caseBarcode === barcode;
  });

  return found || null;
};

export {
  app, database, firestore,
  ref, get, set, push, update, remove, onValue, query, orderByChild, equalTo,
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot,
  firestoreQuery as fsQuery, where, orderBy, limit, Timestamp
};
