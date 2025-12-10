import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, set, push, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';

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

console.log('Firebase initialized, database:', database ? 'OK' : 'FAILED');

// ERP Path prefix - tum veriler erp/ altinda
const ERP_PATH = 'erp';
const erpPath = (path: string) => `${ERP_PATH}/${path}`;

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
  console.log('Subscribing to:', fullPath);
  const unsubscribe = onValue(
    ref(database, fullPath),
    (snapshot) => {
      console.log(`Data received for ${fullPath}:`, snapshot.exists() ? 'has data' : 'empty');
      callback(snapshot.exists() ? snapshot.val() : null);
    },
    (error) => {
      console.error(`Firebase error for ${fullPath}:`, error);
      callback(null);
    }
  );
  return unsubscribe;
};

export { app, auth, database, ref, get, set, push, update, remove, onValue, query, orderByChild, equalTo };
