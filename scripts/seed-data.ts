// Firebase Seed Script - Test verileri ekler
// Kullanım: npx ts-node scripts/seed-data.ts

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://desetkasi-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'desetkasi',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const sampleCustomers = {
  'customer_001': {
    basic: {
      code: 'MUS-001',
      name: 'ABC Market d.o.o.',
      type: 'company',
      status: 'active',
      customerGroup: 'standard',
    },
    contact: {
      email: 'info@abcmarket.si',
      phone: '+386 1 234 5678',
      mobile: '+386 40 123 456',
    },
    addressInfo: {
      street: 'Slovenska cesta 50',
      city: 'Ljubljana',
      postalCode: '1000',
      country: 'SI',
    },
    financial: {
      vatNumber: 'SI12345678',
      balance: 1250.50,
      creditLimit: 10000,
      discount: 5,
      paymentTerms: 30,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  'customer_002': {
    basic: {
      code: 'MUS-002',
      name: 'Merkur Trade',
      type: 'company',
      status: 'active',
      customerGroup: 'vip',
    },
    contact: {
      email: 'nabava@merkur.si',
      phone: '+386 2 345 6789',
    },
    addressInfo: {
      street: 'Tržaška 25',
      city: 'Maribor',
      postalCode: '2000',
      country: 'SI',
    },
    financial: {
      vatNumber: 'SI87654321',
      balance: -500.00,
      creditLimit: 25000,
      discount: 10,
      paymentTerms: 45,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  'customer_003': {
    basic: {
      code: 'MUS-003',
      name: 'Janez Novak',
      type: 'individual',
      status: 'active',
      customerGroup: 'standard',
    },
    contact: {
      email: 'janez.novak@email.si',
      phone: '+386 41 987 654',
    },
    addressInfo: {
      street: 'Cankarjeva 10',
      city: 'Celje',
      postalCode: '3000',
      country: 'SI',
    },
    financial: {
      balance: 0,
      creditLimit: 1000,
      discount: 0,
      paymentTerms: 0,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

const sampleSuppliers = {
  'supplier_001': {
    basic: {
      name: 'Euro Foods GmbH',
      shortName: 'EuroFoods',
      country: 'AT',
      type: 'wholesaler',
      isActive: true,
      categories: ['Gıda', 'İçecek'],
    },
    contact: {
      phone: '+43 1 234 5678',
      email: 'order@eurofoods.at',
      address: {
        street: 'Hauptstrasse 100',
        city: 'Wien',
        postalCode: '1010',
      },
      contactPerson: {
        name: 'Hans Mueller',
        phone: '+43 664 123 456',
      },
    },
    payment: {
      currentBalance: 5500.00,
      paymentTermDays: 30,
      currency: 'EUR',
      bankDetails: {
        bankName: 'Erste Bank',
        iban: 'AT12 3456 7890 1234 5678',
      },
    },
    tax: {
      taxId: 'ATU12345678',
      reverseCharge: true,
      defaultVatRate: 22,
      vies_validated: true,
      vies_validation_date: new Date().toISOString(),
    },
    shipping: {
      transportIncluded: true,
      transportFee: 0,
      minOrderAmount: 500,
    },
    createdAt: new Date().toISOString(),
  },
  'supplier_002': {
    basic: {
      name: 'Mediteran Import d.o.o.',
      shortName: 'Mediteran',
      country: 'SI',
      type: 'distributor',
      isActive: true,
      categories: ['Zeytinyağı', 'Konserve'],
    },
    contact: {
      phone: '+386 5 678 9012',
      email: 'info@mediteran.si',
      address: {
        street: 'Obalna 45',
        city: 'Koper',
        postalCode: '6000',
      },
      contactPerson: {
        name: 'Marko Primorec',
        phone: '+386 41 234 567',
      },
    },
    payment: {
      currentBalance: -1200.00,
      paymentTermDays: 45,
      currency: 'EUR',
    },
    tax: {
      taxId: 'SI98765432',
      reverseCharge: false,
      defaultVatRate: 22,
    },
    shipping: {
      transportIncluded: false,
      transportFee: 50,
      minOrderAmount: 200,
    },
    createdAt: new Date().toISOString(),
  },
  'supplier_003': {
    basic: {
      name: 'Deutsche Qualität AG',
      shortName: 'DQ',
      country: 'DE',
      type: 'manufacturer',
      isActive: true,
      categories: ['Temizlik', 'Kozmetik'],
    },
    contact: {
      phone: '+49 89 123 4567',
      email: 'export@dq-germany.de',
      address: {
        street: 'Industriestrasse 200',
        city: 'München',
        postalCode: '80331',
      },
    },
    payment: {
      currentBalance: 12500.00,
      paymentTermDays: 60,
      currency: 'EUR',
    },
    tax: {
      taxId: 'DE123456789',
      reverseCharge: true,
      defaultVatRate: 19,
      vies_validated: true,
    },
    shipping: {
      transportIncluded: true,
      minOrderAmount: 1000,
    },
    createdAt: new Date().toISOString(),
  },
};

async function seedData() {
  console.log('Firebase Seed başlatılıyor...');
  console.log('Database URL:', firebaseConfig.databaseURL);

  try {
    // Customers
    console.log('\nMüşteriler ekleniyor...');
    await set(ref(database, 'erp/customers'), sampleCustomers);
    console.log('✓ 3 müşteri eklendi');

    // Suppliers
    console.log('\nTedarikçiler ekleniyor...');
    await set(ref(database, 'erp/suppliers'), sampleSuppliers);
    console.log('✓ 3 tedarikçi eklendi');

    console.log('\n✅ Seed işlemi tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('Seed hatası:', error);
    process.exit(1);
  }
}

seedData();
