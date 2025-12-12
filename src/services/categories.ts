/**
 * Merkezi Kategori Sistemi
 * Firebase'deki ANA.ALT formatı ile uyumlu
 * Slovence + Türkçe (admin) isimler
 */

import {
  Beef, Milk, Wheat, Droplets, Flame, Leaf, Fish, Coffee,
  Apple, Cookie, Wine, Package, Sparkles, Baby, Sandwich,
  ShoppingBag, Croissant, Egg, Snowflake, CircleDot, Grid
} from 'lucide-react';

// Kategori tipi
export interface Category {
  code: string;           // Firebase kodu: MEAT, DAIRY
  nameSL: string;         // Slovence
  nameTR: string;         // Türkçe (admin için)
  icon: any;
  color: string;
  bgColor: string;
  ddvRate: number;
  subcategories: Subcategory[];
}

export interface Subcategory {
  code: string;           // Firebase kodu: BEEF, CHEESE
  fullCode: string;       // Tam kod: MEAT.BEEF
  nameSL: string;
  nameTR: string;
}

// ============ KATEGORİLER ============
export const CATEGORIES: Category[] = [
  // ET
  {
    code: 'MEAT',
    nameSL: 'Meso',
    nameTR: 'Et',
    icon: Beef,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'BEEF', fullCode: 'MEAT.BEEF', nameSL: 'Goveje', nameTR: 'Dana' },
      { code: 'LAMB', fullCode: 'MEAT.LAMB', nameSL: 'Jagnjetina', nameTR: 'Kuzu' },
      { code: 'CHICKEN', fullCode: 'MEAT.CHICKEN', nameSL: 'Piščanec', nameTR: 'Tavuk' },
      { code: 'DELI', fullCode: 'MEAT.DELI', nameSL: 'Delikatese', nameTR: 'Şarküteri' },
      { code: 'MINCED', fullCode: 'MEAT.MINCED', nameSL: 'Mleto meso', nameTR: 'Kıyma' },
    ],
  },

  // SÜT ÜRÜNLERİ
  {
    code: 'DAIRY',
    nameSL: 'Mlečni izdelki',
    nameTR: 'Süt Ürünleri',
    icon: Milk,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'CHEESE', fullCode: 'DAIRY.CHEESE', nameSL: 'Sir', nameTR: 'Peynir' },
      { code: 'YOGURT', fullCode: 'DAIRY.YOGURT', nameSL: 'Jogurt', nameTR: 'Yoğurt' },
      { code: 'CREAM', fullCode: 'DAIRY.CREAM', nameSL: 'Smetana', nameTR: 'Krema' },
    ],
  },

  // İÇECEKLER
  {
    code: 'BEVERAGES',
    nameSL: 'Pijače',
    nameTR: 'İçecekler',
    icon: Coffee,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'WATER', fullCode: 'BEVERAGES.WATER', nameSL: 'Voda', nameTR: 'Su' },
      { code: 'JUICE', fullCode: 'BEVERAGES.JUICE', nameSL: 'Sok', nameTR: 'Meyve Suyu' },
      { code: 'TEA', fullCode: 'BEVERAGES.TEA', nameSL: 'Čaj', nameTR: 'Çay' },
      { code: 'COFFEE', fullCode: 'BEVERAGES.COFFEE', nameSL: 'Kava', nameTR: 'Kahve' },
      { code: 'SODA', fullCode: 'BEVERAGES.SODA', nameSL: 'Gazirana pijača', nameTR: 'Gazlı İçecek' },
      { code: 'AYRAN', fullCode: 'BEVERAGES.AYRAN', nameSL: 'Ayran', nameTR: 'Ayran' },
    ],
  },

  // TEMEL GIDA
  {
    code: 'STAPLES',
    nameSL: 'Osnovna živila',
    nameTR: 'Temel Gıda',
    icon: Wheat,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'RICE', fullCode: 'STAPLES.RICE', nameSL: 'Riž', nameTR: 'Pirinç' },
      { code: 'BULGUR', fullCode: 'STAPLES.BULGUR', nameSL: 'Bulgur', nameTR: 'Bulgur' },
      { code: 'PASTA', fullCode: 'STAPLES.PASTA', nameSL: 'Testenine', nameTR: 'Makarna' },
      { code: 'FLOUR', fullCode: 'STAPLES.FLOUR', nameSL: 'Moka', nameTR: 'Un' },
      { code: 'SUGAR', fullCode: 'STAPLES.SUGAR', nameSL: 'Sladkor', nameTR: 'Şeker' },
      { code: 'LEGUMES', fullCode: 'STAPLES.LEGUMES', nameSL: 'Stročnice', nameTR: 'Bakliyat' },
    ],
  },

  // KONSERVE
  {
    code: 'CANNED',
    nameSL: 'Konzerve',
    nameTR: 'Konserve',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'VEGETABLE', fullCode: 'CANNED.VEGETABLE', nameSL: 'Zelenjava', nameTR: 'Sebze' },
      { code: 'OLIVE', fullCode: 'CANNED.OLIVE', nameSL: 'Olive', nameTR: 'Zeytin' },
      { code: 'FISH', fullCode: 'CANNED.FISH', nameSL: 'Ribe', nameTR: 'Balık' },
    ],
  },

  // TAZE
  {
    code: 'FRESH',
    nameSL: 'Sveže',
    nameTR: 'Taze',
    icon: Leaf,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'FRUIT', fullCode: 'FRESH.FRUIT', nameSL: 'Sadje', nameTR: 'Meyve' },
      { code: 'VEGETABLE', fullCode: 'FRESH.VEGETABLE', nameSL: 'Zelenjava', nameTR: 'Sebze' },
    ],
  },

  // ATIŞTIIRMALIK
  {
    code: 'SNACKS',
    nameSL: 'Prigrizki',
    nameTR: 'Atıştırmalık',
    icon: Cookie,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    ddvRate: 22,
    subcategories: [
      { code: 'BISCUIT', fullCode: 'SNACKS.BISCUIT', nameSL: 'Piškoti', nameTR: 'Bisküvi' },
      { code: 'CHOCOLATE', fullCode: 'SNACKS.CHOCOLATE', nameSL: 'Čokolada', nameTR: 'Çikolata' },
      { code: 'CANDY', fullCode: 'SNACKS.CANDY', nameSL: 'Bonboni', nameTR: 'Şekerleme' },
      { code: 'CHIPS', fullCode: 'SNACKS.CHIPS', nameSL: 'Čips', nameTR: 'Cips' },
      { code: 'NUTS', fullCode: 'SNACKS.NUTS', nameSL: 'Oreščki', nameTR: 'Kuruyemiş' },
    ],
  },

  // SOS & BAHARAT
  {
    code: 'SAUCE',
    nameSL: 'Omake',
    nameTR: 'Sos',
    icon: Droplets,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'TOMATO', fullCode: 'SAUCE.TOMATO', nameSL: 'Paradižnik', nameTR: 'Domates' },
      { code: 'OTHER_SAUCE', fullCode: 'SAUCE.OTHER_SAUCE', nameSL: 'Druge omake', nameTR: 'Diğer Soslar' },
    ],
  },

  // BAHARAT
  {
    code: 'SPICES',
    nameSL: 'Začimbe',
    nameTR: 'Baharat',
    icon: Flame,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'MIXED', fullCode: 'SPICES.MIXED', nameSL: 'Mešane začimbe', nameTR: 'Karışık Baharat' },
    ],
  },

  // SÜRME
  {
    code: 'SPREAD',
    nameSL: 'Namazi',
    nameTR: 'Sürme',
    icon: Sandwich,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'CREAM_SPREAD', fullCode: 'SPREAD.CREAM_SPREAD', nameSL: 'Kremni namaz', nameTR: 'Krem Peynir' },
      { code: 'JAM', fullCode: 'SPREAD.JAM', nameSL: 'Marmelada', nameTR: 'Reçel' },
      { code: 'HONEY', fullCode: 'SPREAD.HONEY', nameSL: 'Med', nameTR: 'Bal' },
    ],
  },

  // YAĞ
  {
    code: 'OIL',
    nameSL: 'Olja',
    nameTR: 'Yağ',
    icon: Droplets,
    color: 'text-lime-600',
    bgColor: 'bg-lime-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'COOKING_OIL', fullCode: 'OIL.COOKING_OIL', nameSL: 'Jedilno olje', nameTR: 'Yemeklik Yağ' },
    ],
  },

  // FIRIN
  {
    code: 'BAKERY',
    nameSL: 'Pekarna',
    nameTR: 'Fırın',
    icon: Croissant,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'BREAD', fullCode: 'BAKERY.BREAD', nameSL: 'Kruh', nameTR: 'Ekmek' },
      { code: 'PASTRY', fullCode: 'BAKERY.PASTRY', nameSL: 'Pecivo', nameTR: 'Pasta' },
    ],
  },

  // TOHUM
  {
    code: 'SEEDS',
    nameSL: 'Semena',
    nameTR: 'Tohum',
    icon: Leaf,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'SEEDS', fullCode: 'SEEDS.SEEDS', nameSL: 'Semena', nameTR: 'Tohum' },
    ],
  },

  // HAZIR YEMEK
  {
    code: 'READY',
    nameSL: 'Pripravljeno',
    nameTR: 'Hazır Yemek',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'FALAFEL', fullCode: 'READY.FALAFEL', nameSL: 'Falafel', nameTR: 'Falafel' },
    ],
  },

  // BEBEK
  {
    code: 'BABY',
    nameSL: 'Otroška hrana',
    nameTR: 'Bebek',
    icon: Baby,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    ddvRate: 9.5,
    subcategories: [
      { code: 'FOOD', fullCode: 'BABY.FOOD', nameSL: 'Otroška hrana', nameTR: 'Bebek Maması' },
    ],
  },

  // GIDA DIŞI
  {
    code: 'NONFOOD',
    nameSL: 'Neživila',
    nameTR: 'Gıda Dışı',
    icon: ShoppingBag,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    ddvRate: 22,
    subcategories: [
      { code: 'CLEANING', fullCode: 'NONFOOD.CLEANING', nameSL: 'Čistila', nameTR: 'Temizlik' },
      { code: 'HOUSEHOLD', fullCode: 'NONFOOD.HOUSEHOLD', nameSL: 'Gospodinjstvo', nameTR: 'Ev Gereçleri' },
      { code: 'SOAP', fullCode: 'NONFOOD.SOAP', nameSL: 'Mila', nameTR: 'Sabun' },
    ],
  },

  // TEKSTİL
  {
    code: 'TEXTILE',
    nameSL: 'Tekstil',
    nameTR: 'Tekstil',
    icon: ShoppingBag,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    ddvRate: 22,
    subcategories: [
      { code: 'BEDDING', fullCode: 'TEXTILE.BEDDING', nameSL: 'Posteljnina', nameTR: 'Yatak Takımı' },
    ],
  },

  // DİNİ ÜRÜNLER
  {
    code: 'RELIGIOUS',
    nameSL: 'Verski izdelki',
    nameTR: 'Dini Ürünler',
    icon: Sparkles,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    ddvRate: 22,
    subcategories: [
      { code: 'ITEMS', fullCode: 'RELIGIOUS.ITEMS', nameSL: 'Verski predmeti', nameTR: 'Dini Eşyalar' },
    ],
  },

  // MARKALAR (aslında kategori değil ama Firebase'de var)
  {
    code: 'BRANDS',
    nameSL: 'Blagovne znamke',
    nameTR: 'Markalar',
    icon: Package,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    ddvRate: 22,
    subcategories: [
      { code: 'TURKISH', fullCode: 'BRANDS.TURKISH', nameSL: 'Turške', nameTR: 'Türk Ürünleri' },
      { code: 'BALKAN', fullCode: 'BRANDS.BALKAN', nameSL: 'Balkanske', nameTR: 'Balkan Ürünleri' },
      { code: 'ARABIC', fullCode: 'BRANDS.ARABIC', nameSL: 'Arabske', nameTR: 'Arap Ürünleri' },
      { code: 'INTERNATIONAL', fullCode: 'BRANDS.INTERNATIONAL', nameSL: 'Mednarodne', nameTR: 'Uluslararası' },
    ],
  },

  // DİĞER
  {
    code: 'OTHER',
    nameSL: 'Drugo',
    nameTR: 'Diğer',
    icon: CircleDot,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    ddvRate: 22,
    subcategories: [
      { code: 'UNCATEGORIZED', fullCode: 'OTHER.UNCATEGORIZED', nameSL: 'Nekategorizirano', nameTR: 'Kategorisiz' },
    ],
  },
];

// ============ HELPER FONKSİYONLAR ============

// Tüm kategorileri code bazlı map
export const CATEGORY_MAP: Record<string, Category> = CATEGORIES.reduce((acc, cat) => {
  acc[cat.code] = cat;
  return acc;
}, {} as Record<string, Category>);

// Tüm alt kategorileri fullCode bazlı map
export const SUBCATEGORY_MAP: Record<string, { category: Category; subcategory: Subcategory }> = {};
CATEGORIES.forEach(cat => {
  cat.subcategories.forEach(sub => {
    SUBCATEGORY_MAP[sub.fullCode] = { category: cat, subcategory: sub };
  });
});

/**
 * Firebase kategori kodundan bilgi al
 * @param code "MEAT" veya "MEAT.BEEF" formatı
 * @param lang "sl" veya "tr"
 */
export function getCategoryInfo(code: string, lang: 'sl' | 'tr' = 'sl'): {
  mainCategory: Category | null;
  subcategory: Subcategory | null;
  displayName: string;
  icon: any;
  color: string;
  bgColor: string;
} {
  if (!code) {
    return {
      mainCategory: null,
      subcategory: null,
      displayName: lang === 'sl' ? 'Nekategorizirano' : 'Kategorisiz',
      icon: CircleDot,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  // Alt kategori mi? (MEAT.BEEF)
  if (code.includes('.')) {
    const info = SUBCATEGORY_MAP[code];
    if (info) {
      return {
        mainCategory: info.category,
        subcategory: info.subcategory,
        displayName: lang === 'sl' ? info.subcategory.nameSL : info.subcategory.nameTR,
        icon: info.category.icon,
        color: info.category.color,
        bgColor: info.category.bgColor,
      };
    }
  }

  // Ana kategori mi? (MEAT)
  const mainCat = CATEGORY_MAP[code];
  if (mainCat) {
    return {
      mainCategory: mainCat,
      subcategory: null,
      displayName: lang === 'sl' ? mainCat.nameSL : mainCat.nameTR,
      icon: mainCat.icon,
      color: mainCat.color,
      bgColor: mainCat.bgColor,
    };
  }

  // Eski Türkçe kategorileri migrate et
  const migrated = migrateLegacyCategory(code);
  if (migrated !== code) {
    return getCategoryInfo(migrated, lang);
  }

  // Bulunamadı
  return {
    mainCategory: null,
    subcategory: null,
    displayName: code,
    icon: CircleDot,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  };
}

/**
 * Kategori display name al
 */
export function getCategoryDisplayName(code: string, lang: 'sl' | 'tr' = 'sl'): string {
  return getCategoryInfo(code, lang).displayName;
}

/**
 * DDV oranı al
 */
export function getCategoryDDVRate(code: string): number {
  const info = getCategoryInfo(code);
  return info.mainCategory?.ddvRate ?? 22;
}

/**
 * Eski/legacy kategorileri yeni formata çevir
 */
export function migrateLegacyCategory(oldCode: string): string {
  const migrations: Record<string, string> = {
    // Türkçe eski kategoriler
    'Et ve Et Ürünleri': 'MEAT',
    'Süt Ürünleri': 'DAIRY',
    'Meyve ve Sebze': 'FRESH',
    'Temel Gıdalar': 'STAPLES',
    'İçecekler': 'BEVERAGES',
    'Ev Eşyaları': 'NONFOOD.HOUSEHOLD',
    'Diğer': 'OTHER',
    'Yeni Ürün': 'OTHER.UNCATEGORIZED',
    // Tek kelimelik eski kodlar
    'VEGETABLES': 'FRESH.VEGETABLE',
    'OTHER_ITEMS.MISC': 'OTHER.UNCATEGORIZED',
  };

  return migrations[oldCode] || oldCode;
}

/**
 * B2B dropdown için kategori listesi (hiyerarşik)
 */
export function getCategoryOptionsForDropdown(lang: 'sl' | 'tr' = 'sl'): {
  value: string;
  label: string;
  isHeader?: boolean;
  indent?: boolean;
  count?: number;
}[] {
  const options: { value: string; label: string; isHeader?: boolean; indent?: boolean }[] = [
    { value: 'all', label: lang === 'sl' ? 'Vsi izdelki' : 'Tüm Ürünler' },
  ];

  CATEGORIES.forEach(cat => {
    // Ana kategori
    options.push({
      value: cat.code,
      label: lang === 'sl' ? cat.nameSL : cat.nameTR,
      isHeader: true,
    });

    // Alt kategoriler
    cat.subcategories.forEach(sub => {
      options.push({
        value: sub.fullCode,
        label: lang === 'sl' ? sub.nameSL : sub.nameTR,
        indent: true,
      });
    });
  });

  return options;
}

/**
 * B2B için icon'lu kategori listesi
 */
export function getB2BCategoryList(lang: 'sl' | 'tr' = 'sl'): Record<string, {
  name: string;
  icon: any;
  color: string;
  bgColor: string;
}> {
  const result: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
    all: {
      name: lang === 'sl' ? 'Vsi izdelki' : 'Tüm Ürünler',
      icon: Grid,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  };

  CATEGORIES.forEach(cat => {
    result[cat.code] = {
      name: lang === 'sl' ? cat.nameSL : cat.nameTR,
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
    };

    // Alt kategorileri de ekle
    cat.subcategories.forEach(sub => {
      result[sub.fullCode] = {
        name: lang === 'sl' ? sub.nameSL : sub.nameTR,
        icon: cat.icon,
        color: cat.color,
        bgColor: cat.bgColor,
      };
    });
  });

  return result;
}

/**
 * Kategori filtresi için eşleşme kontrolü
 * @param productCategory Ürünün kategorisi (MEAT.BEEF)
 * @param filterCategory Filtre kategorisi (MEAT veya MEAT.BEEF)
 */
export function matchesCategory(productCategory: string, filterCategory: string): boolean {
  if (filterCategory === 'all') return true;
  if (!productCategory) return false;

  // Tam eşleşme
  if (productCategory === filterCategory) return true;

  // Ana kategori seçilmişse, alt kategoriler de dahil
  if (!filterCategory.includes('.') && productCategory.startsWith(filterCategory + '.')) {
    return true;
  }

  // Legacy migration kontrolü
  const migratedProduct = migrateLegacyCategory(productCategory);
  if (migratedProduct !== productCategory) {
    return matchesCategory(migratedProduct, filterCategory);
  }

  return false;
}
