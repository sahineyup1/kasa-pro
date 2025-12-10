'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { addFirestoreData, updateFirestoreData, subscribeToFirestore } from '@/services/firebase';
import { Loader2, Plus, Trash2, Package, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';

// =================== SLOVENIA DDV CATEGORIES (2025) ===================
const DDV_CATEGORIES = {
  // DDV %9.5 - İndirimli Oran (Gıda & Tarım)
  'Et ve Et Urunleri': { rate: 9.5, description: 'Dana, kuzu, sigir, tavuk vb. et urunleri' },
  'Sarkuteri': { rate: 9.5, description: 'Sosis, sucuk, salam, jambon vb.' },
  'Sut Urunleri': { rate: 9.5, description: 'Sut, peynir, yogurt, tereyagi vb.' },
  'Ekmek ve Firin Urunleri': { rate: 9.5, description: 'Ekmek, pasta, kek, unlu mamuller' },
  'Meyve ve Sebze': { rate: 9.5, description: 'Taze, dondurulmus, konserve meyve/sebze' },
  'Baklagiller ve Tahillar': { rate: 9.5, description: 'Mercimek, nohut, pirinc, bulgur vb.' },
  'Yaglar ve Soslar': { rate: 9.5, description: 'Zeytinyagi, aycicek yagi, sos, ketcap vb.' },
  'Sekersiz Icecekler': { rate: 9.5, description: 'Su, mineralli su, meyve suyu (sekersiz)' },
  'Tarimsal Urunler': { rate: 9.5, description: 'Tohum, gubre, tarim ekipmanlari' },
  'Hasta Mamasi ve Diyet Urunleri': { rate: 9.5, description: 'Bebek mamasi, tibbi gidalar' },
  'Temel Gidalar': { rate: 9.5, description: 'Temel gida maddeleri, un, seker' },

  // DDV %22 - Standart Oran
  'Alkollu Icecekler': { rate: 22.0, description: 'Bira, sarap, votka, raki vb.' },
  'Sekerli Icecekler': { rate: 22.0, description: 'Kola, gazoz, enerji icecegi' },
  'Temizlik Urunleri': { rate: 22.0, description: 'Deterjan, sabun, sampuan' },
  'Kirtasiye': { rate: 22.0, description: 'Defter, kalem, dosya, ofis malzemeleri' },
  'Elektronik': { rate: 22.0, description: 'Telefon, bilgisayar, TV, beyaz esya' },
  'Giyim': { rate: 22.0, description: 'Kiyafet, ayakkabi, aksesuar' },
  'Ev Esyalari': { rate: 22.0, description: 'Mobilya, dekorasyon, mutfak esyalari' },
  'Kozmetik': { rate: 22.0, description: 'Makyaj malzemeleri, parfum' },
  'Oyuncak ve Hobiler': { rate: 22.0, description: 'Oyuncaklar, spor malzemeleri' },
  'Diger': { rate: 22.0, description: 'Diger standart DDV\'ye tabi urunler' },

  // DDV %5 - Süper İndirimli
  'Kitap ve Yayinlar': { rate: 5.0, description: 'Basili kitaplar, e-kitaplar, gazeteler' },
  'Egitim Materyalleri': { rate: 5.0, description: 'Ders kitaplari, egitim yazilimlari' },

  // DDV %0 - İstisna
  'Ilac ve Tibbi Malzemeler': { rate: 0.0, description: 'Receteli ilaclar, tibbi cihazlar' },
  'Ihracat ve AB Ici Tedarik': { rate: 0.0, description: 'Disa satis, AB ici ticaret' },
};

// Units
const UNITS = [
  { value: 'adet', label: 'Adet' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'lt', label: 'Litre (lt)' },
  { value: 'ml', label: 'Mililitre (ml)' },
  { value: 'paket', label: 'Paket' },
  { value: 'kutu', label: 'Kutu' },
  { value: 'm', label: 'Metre (m)' },
];

// Target Customer Types
const TARGET_CUSTOMERS = [
  { value: 'both', label: 'Her Ikisi' },
  { value: 'market', label: 'Market' },
  { value: 'kasap', label: 'Kasap' },
];

interface Product {
  id: string;
  basic?: {
    name?: string;
    sku?: string;
    description?: string;
    category?: string;
    subcategory?: string;
    targetCustomer?: string;
    brand?: string;
    manufacturer?: string;
  };
  barcodes?: {
    mainBarcode?: string;
    alternativeBarcodes?: Record<string, { type: string; enabled: boolean }>;
    caseBarcode?: {
      barcode?: string;
      caseQuantity?: number;
      enabled?: boolean;
    };
  };
  pricing?: {
    baseCost?: number;
    vatRate?: number;
    currency?: string;
    branchPricing?: Record<string, {
      unitPrice?: number;
      casePrice?: number;
      markup?: number;
    }>;
  };
  stock?: {
    unit?: string;
    totalStock?: number;
    branchStock?: Record<string, {
      currentStock?: number;
      minStock?: number;
      location?: string;
    }>;
  };
  supplier?: {
    supplierId?: string;
    supplierName?: string;
    supplierSKU?: string;
    leadTime?: number;
    minOrderQty?: number;
  };
  compliance?: {
    halalCertified?: boolean;
    origin?: string;
    animalWelfare?: boolean;
    slaughterhouseId?: string;
    veterinaryCertificate?: string;
  };
  declaration?: {
    si?: string;
    en?: string;
  };
  tracking?: {
    allowNegativeStock?: boolean;
    trackLots?: boolean;
    trackExpiry?: boolean;
  };
  audit?: {
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  // Flat structure support
  name?: string;
  barcode?: string;
  price?: number;
}

interface Supplier {
  id: string;
  basic?: { name?: string };
  name?: string;
}

interface Branch {
  id: string;
  name?: string;
  type?: string;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave?: () => void;
}

// Helper to get field from nested or flat structure
function getField<T>(product: Product | null, nestedPath: string[], flatKey: string, defaultVal: T): T {
  if (!product) return defaultVal;

  let value: any = product;
  for (const key of nestedPath) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = undefined;
      break;
    }
  }
  if (value !== undefined && value !== null) return value as T;

  const flatValue = (product as any)[flatKey];
  if (flatValue !== undefined && flatValue !== null) return flatValue as T;

  return defaultVal;
}

// Validation message component
function ValidationMessage({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700">Hazir</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errors.map((err, i) => (
        <div key={`err-${i}`} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{err}</span>
        </div>
      ))}
      {warnings.map((warn, i) => (
        <div key={`warn-${i}`} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700">{warn}</span>
        </div>
      ))}
    </div>
  );
}

export function ProductDialog({ open, onOpenChange, product, onSave }: ProductDialogProps) {
  const isEditMode = !!product;

  // =================== FORM STATE ===================

  // Basic info
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('both');
  const [brand, setBrand] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Barcodes
  const [mainBarcode, setMainBarcode] = useState('');
  const [alternativeBarcodes, setAlternativeBarcodes] = useState<Record<string, { type: string; enabled: boolean }>>({});
  const [newAltBarcode, setNewAltBarcode] = useState('');
  const [newAltBarcodeType, setNewAltBarcodeType] = useState('alternative');
  const [caseEnabled, setCaseEnabled] = useState(false);
  const [caseBarcode, setCaseBarcode] = useState('');
  const [caseQuantity, setCaseQuantity] = useState('12');

  // Pricing
  const [baseCost, setBaseCost] = useState('');
  const [vatRate, setVatRate] = useState('9.5');
  const [currency, setCurrency] = useState('EUR');
  const [marginPercent, setMarginPercent] = useState(40);
  const [branchPricing, setBranchPricing] = useState<Record<string, { unitPrice: string; casePrice: string }>>({});

  // Stock
  const [unit, setUnit] = useState('adet');
  const [branchStock, setBranchStock] = useState<Record<string, { currentStock: string; minStock: string; location: string }>>({});

  // Supplier
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierSKU, setSupplierSKU] = useState('');
  const [leadTime, setLeadTime] = useState('2');
  const [minOrderQty, setMinOrderQty] = useState('10');

  // Compliance (for meat products)
  const [halalCertified, setHalalCertified] = useState(false);
  const [animalWelfare, setAnimalWelfare] = useState(false);
  const [origin, setOrigin] = useState('Slovenia');
  const [slaughterhouseId, setSlaughterhouseId] = useState('');
  const [vetCertificate, setVetCertificate] = useState('');

  // Declaration
  const [declarationSI, setDeclarationSI] = useState('');
  const [declarationEN, setDeclarationEN] = useState('');

  // Tracking
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [trackLots, setTrackLots] = useState(false);
  const [trackExpiry, setTrackExpiry] = useState(false);

  // External data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [showPriceCalculator, setShowPriceCalculator] = useState(false);

  // =================== LOAD EXTERNAL DATA ===================

  useEffect(() => {
    const unsubSuppliers = subscribeToFirestore('suppliers', (data) => {
      setSuppliers(data || []);
    });

    const unsubBranches = subscribeToFirestore('branches', (data) => {
      setBranches(data || []);
    });

    const unsubSubcategories = subscribeToFirestore('subcategories', (data) => {
      // Subcategories are stored per parent category
      if (category && data) {
        const catData = data.find((d: any) => d.id === category || d.categoryName === category);
        if (catData?.subcategories) {
          setSubcategories(catData.subcategories);
        } else {
          setSubcategories([]);
        }
      }
    });

    return () => {
      unsubSuppliers();
      unsubBranches();
      unsubSubcategories();
    };
  }, [category]);

  // Initialize branch pricing/stock when branches load
  useEffect(() => {
    if (branches.length > 0 && Object.keys(branchPricing).length === 0) {
      const initialPricing: Record<string, { unitPrice: string; casePrice: string }> = {};
      const initialStock: Record<string, { currentStock: string; minStock: string; location: string }> = {};

      branches.forEach(branch => {
        if (branch.type !== 'warehouse') {
          initialPricing[branch.id] = { unitPrice: '', casePrice: '' };
        }
        initialStock[branch.id] = { currentStock: '0', minStock: '10', location: '' };
      });

      setBranchPricing(initialPricing);
      setBranchStock(initialStock);
    }
  }, [branches]);

  // =================== AUTO DDV RATE ===================

  useEffect(() => {
    if (category && DDV_CATEGORIES[category as keyof typeof DDV_CATEGORIES]) {
      const ddvInfo = DDV_CATEGORIES[category as keyof typeof DDV_CATEGORIES];
      setVatRate(ddvInfo.rate.toString());
    }
  }, [category]);

  // =================== VALIDATION ===================

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name.trim()) errors.push('Urun adi zorunlu');
    if (!category) errors.push('Kategori secilmeli');
    if (!mainBarcode.trim()) errors.push('Ana barkod zorunlu');
    if (!baseCost || parseFloat(baseCost) <= 0) errors.push('Maliyet fiyati 0\'dan buyuk olmali');

    // Meat product warnings
    const meatCategories = ['Et ve Et Urunleri', 'Sarkuteri'];
    if (meatCategories.includes(category)) {
      if (!origin.trim()) warnings.push('Et urunleri icin mensei onerilir');
      if (!halalCertified) warnings.push('Helal sertifikasi onerilir');
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }, [name, category, mainBarcode, baseCost, origin, halalCertified]);

  // =================== MARGIN CALCULATION ===================

  const calculatedPrice = useMemo(() => {
    const cost = parseFloat(baseCost) || 0;
    if (cost <= 0) return 0;

    // Simple margin calculation: price = cost / (1 - margin%)
    const margin = marginPercent / 100;
    return cost / (1 - margin);
  }, [baseCost, marginPercent]);

  const marginAmount = useMemo(() => {
    const cost = parseFloat(baseCost) || 0;
    return calculatedPrice - cost;
  }, [calculatedPrice, baseCost]);

  // =================== RESET FORM ===================

  useEffect(() => {
    if (open) {
      if (product) {
        // Edit mode - load existing data
        setName(getField(product, ['basic', 'name'], 'name', ''));
        setSku(getField(product, ['basic', 'sku'], 'sku', ''));
        setDescription(getField(product, ['basic', 'description'], 'description', ''));
        setCategory(getField(product, ['basic', 'category'], 'category', ''));
        setSubcategory(getField(product, ['basic', 'subcategory'], 'subcategory', ''));
        setTargetCustomer(getField(product, ['basic', 'targetCustomer'], 'targetCustomer', 'both'));
        setBrand(getField(product, ['basic', 'brand'], 'brand', ''));
        setManufacturer(getField(product, ['basic', 'manufacturer'], 'manufacturer', ''));
        setIsActive(getField(product, ['audit', 'isActive'], 'isActive', true));

        setMainBarcode(getField(product, ['barcodes', 'mainBarcode'], 'barcode', ''));
        setAlternativeBarcodes(getField(product, ['barcodes', 'alternativeBarcodes'], 'alternativeBarcodes', {}));
        const caseInfo = getField<{ enabled?: boolean; barcode?: string; caseQuantity?: number }>(
          product, ['barcodes', 'caseBarcode'], 'caseBarcode', { enabled: false }
        );
        setCaseEnabled(caseInfo?.enabled || false);
        setCaseBarcode(caseInfo?.barcode || '');
        setCaseQuantity(String(caseInfo?.caseQuantity || 12));

        setBaseCost(String(getField(product, ['pricing', 'baseCost'], 'cost', '') || ''));
        setVatRate(String(getField(product, ['pricing', 'vatRate'], 'vatRate', 9.5)));
        setCurrency(getField(product, ['pricing', 'currency'], 'currency', 'EUR'));

        setUnit(getField(product, ['stock', 'unit'], 'unit', 'adet'));

        setSupplierId(getField(product, ['supplier', 'supplierId'], 'supplierId', ''));
        setSupplierName(getField(product, ['supplier', 'supplierName'], 'supplierName', ''));
        setSupplierSKU(getField(product, ['supplier', 'supplierSKU'], 'supplierSKU', ''));
        setLeadTime(String(getField(product, ['supplier', 'leadTime'], 'leadTime', 2)));
        setMinOrderQty(String(getField(product, ['supplier', 'minOrderQty'], 'minOrderQty', 10)));

        setHalalCertified(getField(product, ['compliance', 'halalCertified'], 'halalCertified', false));
        setAnimalWelfare(getField(product, ['compliance', 'animalWelfare'], 'animalWelfare', false));
        setOrigin(getField(product, ['compliance', 'origin'], 'origin', 'Slovenia'));
        setSlaughterhouseId(getField(product, ['compliance', 'slaughterhouseId'], 'slaughterhouseId', ''));
        setVetCertificate(getField(product, ['compliance', 'veterinaryCertificate'], 'veterinaryCertificate', ''));

        setDeclarationSI(getField(product, ['declaration', 'si'], 'declarationSI', ''));
        setDeclarationEN(getField(product, ['declaration', 'en'], 'declarationEN', ''));

        setAllowNegativeStock(getField(product, ['tracking', 'allowNegativeStock'], 'allowNegativeStock', false));
        setTrackLots(getField(product, ['tracking', 'trackLots'], 'trackLots', false));
        setTrackExpiry(getField(product, ['tracking', 'trackExpiry'], 'trackExpiry', false));

        // Load branch pricing and stock
        const existingBranchPricing = getField(product, ['pricing', 'branchPricing'], 'branchPricing', {});
        const existingBranchStock = getField(product, ['stock', 'branchStock'], 'branchStock', {});

        const pricingState: Record<string, { unitPrice: string; casePrice: string }> = {};
        const stockState: Record<string, { currentStock: string; minStock: string; location: string }> = {};

        Object.entries(existingBranchPricing).forEach(([branchId, data]: [string, any]) => {
          pricingState[branchId] = {
            unitPrice: String(data?.unitPrice || ''),
            casePrice: String(data?.casePrice || ''),
          };
        });

        Object.entries(existingBranchStock).forEach(([branchId, data]: [string, any]) => {
          stockState[branchId] = {
            currentStock: String(data?.currentStock || 0),
            minStock: String(data?.minStock || 10),
            location: data?.location || '',
          };
        });

        if (Object.keys(pricingState).length > 0) setBranchPricing(pricingState);
        if (Object.keys(stockState).length > 0) setBranchStock(stockState);

      } else {
        // New product - reset form
        setName('');
        setSku('');
        setDescription('');
        setCategory('');
        setSubcategory('');
        setTargetCustomer('both');
        setBrand('');
        setManufacturer('');
        setIsActive(true);
        setMainBarcode('');
        setAlternativeBarcodes({});
        setNewAltBarcode('');
        setCaseEnabled(false);
        setCaseBarcode('');
        setCaseQuantity('12');
        setBaseCost('');
        setVatRate('9.5');
        setCurrency('EUR');
        setMarginPercent(40);
        setBranchPricing({});
        setUnit('adet');
        setBranchStock({});
        setSupplierId('');
        setSupplierName('');
        setSupplierSKU('');
        setLeadTime('2');
        setMinOrderQty('10');
        setHalalCertified(false);
        setAnimalWelfare(false);
        setOrigin('Slovenia');
        setSlaughterhouseId('');
        setVetCertificate('');
        setDeclarationSI('');
        setDeclarationEN('');
        setAllowNegativeStock(false);
        setTrackLots(false);
        setTrackExpiry(false);
        setShowPriceCalculator(false);
      }
    }
  }, [open, product]);

  // =================== HANDLERS ===================

  const handleAddAltBarcode = () => {
    if (!newAltBarcode.trim()) return;
    if (alternativeBarcodes[newAltBarcode]) {
      alert('Bu barkod zaten ekli!');
      return;
    }
    setAlternativeBarcodes({
      ...alternativeBarcodes,
      [newAltBarcode]: { type: newAltBarcodeType, enabled: true }
    });
    setNewAltBarcode('');
  };

  const handleRemoveAltBarcode = (barcode: string) => {
    const updated = { ...alternativeBarcodes };
    delete updated[barcode];
    setAlternativeBarcodes(updated);
  };

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    const supplier = suppliers.find(s => s.id === value);
    if (supplier) {
      setSupplierName(supplier.basic?.name || supplier.name || '');
    }
  };

  const handleApplyCalculatedPrice = () => {
    // Apply to all branches
    const updated = { ...branchPricing };
    Object.keys(updated).forEach(branchId => {
      updated[branchId].unitPrice = calculatedPrice.toFixed(2);
    });
    setBranchPricing(updated);
    setShowPriceCalculator(false);
  };

  const handleSave = async () => {
    if (!validation.isValid) {
      alert('Lutfen tum zorunlu alanlari doldurun!');
      return;
    }

    setSaving(true);
    try {
      // Build branch pricing data
      const branchPricingData: Record<string, any> = {};
      Object.entries(branchPricing).forEach(([branchId, data]) => {
        const up = parseFloat(data.unitPrice) || 0;
        const cp = parseFloat(data.casePrice) || 0;
        const base = parseFloat(baseCost) || 0;
        const markup = base > 0 ? up / base : 1;

        branchPricingData[branchId] = {
          unitPrice: up,
          casePrice: cp,
          markup: parseFloat(markup.toFixed(2)),
          promotionPrice: null,
          promotionActive: false,
        };
      });

      // Build branch stock data
      const branchStockData: Record<string, any> = {};
      let totalStock = 0;
      Object.entries(branchStock).forEach(([branchId, data]) => {
        const current = parseFloat(data.currentStock) || 0;
        const min = parseFloat(data.minStock) || 10;
        totalStock += current;

        branchStockData[branchId] = {
          currentStock: current,
          minStock: min,
          maxStock: min * 10,
          location: data.location,
          lastUpdate: new Date().toISOString(),
          reorderPoint: min,
          reorderQty: min * 2,
        };
      });

      const productData = {
        basic: {
          name: name.trim(),
          sku: sku.trim() || mainBarcode.trim(),
          description: description.trim(),
          category,
          subcategory,
          targetCustomer,
          brand: brand.trim(),
          manufacturer: manufacturer.trim(),
        },
        barcodes: {
          mainBarcode: mainBarcode.trim(),
          alternativeBarcodes,
          caseBarcode: caseEnabled ? {
            barcode: caseBarcode.trim(),
            caseQuantity: parseInt(caseQuantity) || 12,
            enabled: true,
          } : { enabled: false },
        },
        pricing: {
          baseCost: parseFloat(baseCost) || 0,
          vatRate: parseFloat(vatRate) || 9.5,
          currency,
          branchPricing: branchPricingData,
        },
        stock: {
          unit,
          totalStock,
          branchStock: branchStockData,
        },
        supplier: {
          supplierId,
          supplierName: supplierName.trim(),
          supplierSKU: supplierSKU.trim(),
          leadTime: parseInt(leadTime) || 2,
          minOrderQty: parseInt(minOrderQty) || 10,
          lastPurchasePrice: parseFloat(baseCost) || 0,
          lastPurchaseDate: new Date().toISOString(),
          preferredSupplier: true,
        },
        compliance: {
          halalCertified,
          animalWelfare,
          origin: origin.trim(),
          slaughterhouseId: slaughterhouseId.trim(),
          veterinaryCertificate: vetCertificate.trim(),
          allergens: [],
        },
        declaration: {
          si: declarationSI.trim(),
          en: declarationEN.trim(),
        },
        tracking: {
          trackInventory: true,
          batchTracking: trackLots,
          expiryTracking: trackExpiry,
          serialTracking: false,
          allowNegativeStock,
          allowBackorder: false,
        },
        audit: {
          isActive,
          updatedAt: new Date().toISOString(),
        },
      };

      if (isEditMode && product?.id) {
        await updateFirestoreData('products', product.id, productData);
      } else {
        await addFirestoreData('products', {
          ...productData,
          audit: {
            ...productData.audit,
            createdAt: new Date().toISOString(),
          },
        });
      }

      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      alert('Kaydetme hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // =================== RENDER ===================

  const categoryOptions = Object.keys(DDV_CATEGORIES);
  const warehouse = branches.find(b => b.type === 'warehouse');
  const storeBranches = branches.filter(b => b.type !== 'warehouse');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? 'Urun Duzenle' : 'Yeni Urun Ekle'}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode ? 'Urun bilgilerini guncelleyin' : 'Yeni urun eklemek icin formu doldurun'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
              <TabsTrigger value="pricing">Fiyat & Stok</TabsTrigger>
              <TabsTrigger value="supplier">Tedarik & Barkod</TabsTrigger>
              <TabsTrigger value="compliance">Uyumluluk</TabsTrigger>
            </TabsList>

            {/* =================== BASIC INFO TAB =================== */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Left column - Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Urun Adi *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Orn: Kuzu Kiyma"
                      className={!name.trim() ? 'border-red-300' : ''}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Ust Kategori *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className={!category ? 'border-red-300' : ''}>
                          <SelectValue placeholder="Kategori secin" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {categoryOptions.map((cat) => {
                            const info = DDV_CATEGORIES[cat as keyof typeof DDV_CATEGORIES];
                            return (
                              <SelectItem key={cat} value={cat}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{cat}</span>
                                  <span className="text-xs text-gray-500 ml-2">%{info.rate}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {category && (
                        <p className="text-xs text-gray-500">
                          DDV: %{DDV_CATEGORIES[category as keyof typeof DDV_CATEGORIES]?.rate} - {DDV_CATEGORIES[category as keyof typeof DDV_CATEGORIES]?.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Alt Kategori</Label>
                      <div className="flex gap-2">
                        <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Alt kategori secin" />
                          </SelectTrigger>
                          <SelectContent>
                            {subcategories.map((sub) => (
                              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" disabled={!category}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hedef Musteri</Label>
                    <div className="flex gap-2">
                      {TARGET_CUSTOMERS.map((tc) => (
                        <Button
                          key={tc.value}
                          type="button"
                          variant={targetCustomer === tc.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTargetCustomer(tc.value)}
                          className="flex-1"
                        >
                          {tc.value === 'market' && '🏪 '}
                          {tc.value === 'kasap' && '🥩 '}
                          {tc.value === 'both' && '🔄 '}
                          {tc.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU / Stok Kodu</Label>
                      <Input
                        id="sku"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Orn: KM-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Marka</Label>
                      <Input
                        id="brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Marka adi"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Uretici</Label>
                    <Input
                      id="manufacturer"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="Uretici firma"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Aciklama</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Urun hakkinda ek bilgiler..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={(checked) => setIsActive(checked as boolean)}
                    />
                    <Label htmlFor="isActive" className="font-normal">Aktif Urun</Label>
                  </div>
                </div>

                {/* Right column - Image placeholder */}
                <div className="space-y-4">
                  <Label>Urun Fotografi</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-sm text-gray-500">
                      Foto yukleme icin tiklayiniz
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      PNG, JPG (max 2MB)
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* =================== PRICING & STOCK TAB =================== */}
            <TabsContent value="pricing" className="space-y-6">
              {/* Pricing Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">💰</span> Fiyatlandirma
                </h4>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseCost">Maliyet Fiyati (EUR) *</Label>
                    <Input
                      id="baseCost"
                      type="number"
                      step="0.01"
                      value={baseCost}
                      onChange={(e) => setBaseCost(e.target.value)}
                      placeholder="0.00"
                      className={!baseCost || parseFloat(baseCost) <= 0 ? 'border-red-300' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatRate">DDV Orani</Label>
                    <Select value={vatRate} onValueChange={setVatRate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">%0 (Muaf)</SelectItem>
                        <SelectItem value="5">%5 (Super Indirimli)</SelectItem>
                        <SelectItem value="9.5">%9.5 (Indirimli)</SelectItem>
                        <SelectItem value="22">%22 (Standart)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Para Birimi</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="TRY">TRY (₺)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Calculator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-blue-800 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Akilli Fiyat Hesaplayici
                    </h5>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPriceCalculator(!showPriceCalculator)}
                    >
                      {showPriceCalculator ? 'Gizle' : 'Goster'}
                    </Button>
                  </div>

                  {showPriceCalculator && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Kar Marji: %{marginPercent}</Label>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={marginPercent}
                          onChange={(e) => setMarginPercent(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>%10 (Dusuk)</span>
                          <span>%40 (Orta)</span>
                          <span>%100 (Yuksek)</span>
                        </div>
                      </div>

                      {parseFloat(baseCost) > 0 && (
                        <div className="bg-white rounded-lg p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Maliyet:</span>
                            <span>€{parseFloat(baseCost).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Kar Marji ({marginPercent}%):</span>
                            <span className="text-green-600">€{marginAmount.toFixed(2)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-semibold">
                            <span>Onerilen Satis Fiyati:</span>
                            <span className="text-blue-600 text-lg">€{calculatedPrice.toFixed(2)}</span>
                          </div>
                          <Button
                            className="w-full mt-2"
                            onClick={handleApplyCalculatedPrice}
                            disabled={storeBranches.length === 0}
                          >
                            Tum Subelere Uygula
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Branch Pricing */}
                <div className="space-y-3">
                  <Label>Sube Fiyatlari</Label>
                  {storeBranches.map((branch) => (
                    <div key={branch.id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                      <span className="font-medium w-40">
                        {branch.type === 'butcher' ? '🥩' : '🏪'} {branch.name}
                      </span>
                      <div className="flex-1 flex gap-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Birim fiyat"
                          value={branchPricing[branch.id]?.unitPrice || ''}
                          onChange={(e) => setBranchPricing({
                            ...branchPricing,
                            [branch.id]: { ...branchPricing[branch.id], unitPrice: e.target.value }
                          })}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Kutu fiyat"
                          value={branchPricing[branch.id]?.casePrice || ''}
                          onChange={(e) => setBranchPricing({
                            ...branchPricing,
                            [branch.id]: { ...branchPricing[branch.id], casePrice: e.target.value }
                          })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Section */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">📦</span> Stok Ayarlari
                </h4>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Bilgi:</strong> Urun stoku sadece Merkez Depo'ya girilebilir. Subelere dagitim transfer sistemi ile yapilir.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Birim</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Warehouse Stock */}
                {warehouse && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <Label className="text-green-800 font-semibold">🏭 Merkez Depo Stoku</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Mevcut stok"
                        value={branchStock[warehouse.id]?.currentStock || '0'}
                        onChange={(e) => setBranchStock({
                          ...branchStock,
                          [warehouse.id]: { ...branchStock[warehouse.id], currentStock: e.target.value }
                        })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Min stok"
                        value={branchStock[warehouse.id]?.minStock || '10'}
                        onChange={(e) => setBranchStock({
                          ...branchStock,
                          [warehouse.id]: { ...branchStock[warehouse.id], minStock: e.target.value }
                        })}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Konum/Raf"
                        value={branchStock[warehouse.id]?.location || ''}
                        onChange={(e) => setBranchStock({
                          ...branchStock,
                          [warehouse.id]: { ...branchStock[warehouse.id], location: e.target.value }
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                {/* Branch Stock (readonly info) */}
                {storeBranches.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-gray-600">Sube Stoklari (Sadece Goruntuleme)</Label>
                    {storeBranches.map((branch) => (
                      <div key={branch.id} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                        <span className="font-medium w-40 text-gray-600">
                          {branch.type === 'butcher' ? '🥩' : '🏪'} {branch.name}
                        </span>
                        <Input
                          type="number"
                          placeholder="Stok"
                          value={branchStock[branch.id]?.currentStock || '0'}
                          disabled={!isEditMode}
                          className="flex-1 bg-gray-100"
                        />
                        <Input
                          type="number"
                          placeholder="Min"
                          value={branchStock[branch.id]?.minStock || '10'}
                          onChange={(e) => setBranchStock({
                            ...branchStock,
                            [branch.id]: { ...branchStock[branch.id], minStock: e.target.value }
                          })}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 italic">Transfer ile</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tracking Options */}
                <div className="space-y-3 pt-4">
                  <Label>Stok Izleme Secenekleri</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowNegativeStock"
                        checked={allowNegativeStock}
                        onCheckedChange={(checked) => setAllowNegativeStock(checked as boolean)}
                      />
                      <Label htmlFor="allowNegativeStock" className="font-normal">Negatif stoka izin ver</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="trackLots"
                        checked={trackLots}
                        onCheckedChange={(checked) => setTrackLots(checked as boolean)}
                      />
                      <Label htmlFor="trackLots" className="font-normal">Lot/Parti numarasi takibi</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="trackExpiry"
                        checked={trackExpiry}
                        onCheckedChange={(checked) => setTrackExpiry(checked as boolean)}
                      />
                      <Label htmlFor="trackExpiry" className="font-normal">Son kullanma tarihi takibi</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* =================== SUPPLIER & BARCODE TAB =================== */}
            <TabsContent value="supplier" className="space-y-6">
              {/* Barcode Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">🔢</span> Barkod Bilgileri
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="mainBarcode">Ana Barkod *</Label>
                  <Input
                    id="mainBarcode"
                    value={mainBarcode}
                    onChange={(e) => setMainBarcode(e.target.value)}
                    placeholder="8, 12, 13 veya 14 haneli barkod"
                    className={`font-mono ${!mainBarcode.trim() ? 'border-red-300' : ''}`}
                  />
                  <p className="text-xs text-gray-500">
                    Standart: EAN-13 (13 hane), EAN-8 (8 hane), UPC (12 hane)
                  </p>
                </div>

                {/* Alternative Barcodes */}
                <div className="space-y-2">
                  <Label>Alternatif Barkodlar</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAltBarcode}
                      onChange={(e) => setNewAltBarcode(e.target.value)}
                      placeholder="Alternatif barkod"
                      className="flex-1 font-mono"
                    />
                    <Select value={newAltBarcodeType} onValueChange={setNewAltBarcodeType}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alternative">Alternatif</SelectItem>
                        <SelectItem value="supplier">Tedarikci</SelectItem>
                        <SelectItem value="internal">Dahili</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleAddAltBarcode}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {Object.entries(alternativeBarcodes).length > 0 && (
                    <div className="space-y-1 mt-2">
                      {Object.entries(alternativeBarcodes).map(([barcode, info]) => (
                        <div key={barcode} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                          <span className="font-mono flex-1">{barcode}</span>
                          <span className="text-xs text-gray-500">({info.type})</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveAltBarcode(barcode)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Case Barcode */}
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="caseEnabled"
                      checked={caseEnabled}
                      onCheckedChange={(checked) => setCaseEnabled(checked as boolean)}
                    />
                    <Label htmlFor="caseEnabled" className="font-medium">📦 Kutu barkodu kullan</Label>
                  </div>

                  {caseEnabled && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="caseBarcode">Kutu Barkodu</Label>
                        <Input
                          id="caseBarcode"
                          value={caseBarcode}
                          onChange={(e) => setCaseBarcode(e.target.value)}
                          placeholder="Kutu barkodu"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="caseQuantity">Kutu Icindeki Adet</Label>
                        <Input
                          id="caseQuantity"
                          type="number"
                          value={caseQuantity}
                          onChange={(e) => setCaseQuantity(e.target.value)}
                          min="1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Section */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">🏭</span> Tedarikci Bilgileri
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Tedarikci</Label>
                    <Select value={supplierId} onValueChange={handleSupplierChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tedarikci secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.filter(s => s.id).map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.basic?.name || sup.name || sup.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierSKU">Tedarikci Stok Kodu</Label>
                    <Input
                      id="supplierSKU"
                      value={supplierSKU}
                      onChange={(e) => setSupplierSKU(e.target.value)}
                      placeholder="Tedarikcinin verdigi kod"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leadTime">Teslimat Suresi</Label>
                    <div className="flex gap-2">
                      <Input
                        id="leadTime"
                        type="number"
                        value={leadTime}
                        onChange={(e) => setLeadTime(e.target.value)}
                        min="0"
                        className="flex-1"
                      />
                      <span className="flex items-center text-gray-500">gun</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minOrderQty">Min. Siparis Miktari</Label>
                    <Input
                      id="minOrderQty"
                      type="number"
                      value={minOrderQty}
                      onChange={(e) => setMinOrderQty(e.target.value)}
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* =================== COMPLIANCE TAB =================== */}
            <TabsContent value="compliance" className="space-y-6">
              {/* Meat Compliance */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">🥩</span> Et Urunleri Uyumlulugu
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="halalCertified"
                      checked={halalCertified}
                      onCheckedChange={(checked) => setHalalCertified(checked as boolean)}
                    />
                    <Label htmlFor="halalCertified" className="font-normal">✅ Helal Sertifikali</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="animalWelfare"
                      checked={animalWelfare}
                      onCheckedChange={(checked) => setAnimalWelfare(checked as boolean)}
                    />
                    <Label htmlFor="animalWelfare" className="font-normal">🐄 Hayvan Refahi Standartlarina Uygun</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Mensei *</Label>
                    <Input
                      id="origin"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="Orn: Slovenia, Turkey, Germany"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slaughterhouseId">Kesimhane ID</Label>
                    <Input
                      id="slaughterhouseId"
                      value={slaughterhouseId}
                      onChange={(e) => setSlaughterhouseId(e.target.value)}
                      placeholder="Kesimhane kimlik no"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vetCertificate">Veteriner Sertifika No</Label>
                  <Input
                    id="vetCertificate"
                    value={vetCertificate}
                    onChange={(e) => setVetCertificate(e.target.value)}
                    placeholder="Sertifika numarasi"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 Et urunleri icin mensei ve helal sertifikasi onerilir.<br />
                    🇪🇺 AB standartlarina uygunluk zorunludur.
                  </p>
                </div>
              </div>

              {/* Declaration */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">📜</span> Deklarasyon
                </h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="declarationSI">🇸🇮 Slovence Deklarasyon</Label>
                    <Textarea
                      id="declarationSI"
                      value={declarationSI}
                      onChange={(e) => setDeclarationSI(e.target.value)}
                      placeholder="Sveze mlet ovcje meso. Hraniti pri 0-4°C. Uporabiti v 5 dneh."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="declarationEN">🇬🇧 English Declaration (Optional)</Label>
                    <Textarea
                      id="declarationEN"
                      value={declarationEN}
                      onChange={(e) => setDeclarationEN(e.target.value)}
                      placeholder="Fresh minced lamb. Store at 0-4°C. Use within 5 days."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 space-y-3">
          <ValidationMessage errors={validation.errors} warnings={validation.warnings} />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Iptal
            </Button>
            <Button onClick={handleSave} disabled={saving || !validation.isValid}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Urunu Kaydet'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
