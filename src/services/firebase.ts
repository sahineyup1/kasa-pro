import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, set, push, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';
import {
  getFirestore,
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
  Timestamp
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
const auth = getAuth(app);
const database = getDatabase(app);
const firestore = getFirestore(app);

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

export {
  app, auth, database, firestore,
  ref, get, set, push, update, remove, onValue, query, orderByChild, equalTo,
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot,
  firestoreQuery as fsQuery, where, orderBy, limit, Timestamp
};
