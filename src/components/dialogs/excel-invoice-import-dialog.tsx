'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, Upload, CheckCircle, XCircle, AlertTriangle,
  Store, Building2, Truck, Package, RefreshCw, Plus, Download
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { addFirestoreData, subscribeToRTDB, subscribeToBranches } from '@/services/firebase';
import { supplierMatcher } from '@/services/supplier-product-matcher';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Column keywords for auto-detection
const COLUMN_KEYWORDS = {
  supplierCode: ['tedarikci', 'tedarikçi', 'supplier', 'partner', 'kod', 'code', 'sifra', 'şifra'],
  ourCode: ['bizim', 'sifra', 'şifra', 'kod', 'code', 'sku', 'stok'],
  productName: ['urun', 'ürün', 'product', 'ad', 'name', 'isim', 'aciklama', 'açıklama', 'description'],
  quantity: ['miktar', 'quantity', 'qty', 'adet', 'amount', 'kolicina', 'menge'],
  unit: ['birim', 'unit', 'olcu', 'ölçü', 'einheit'],
  unitPrice: ['fiyat', 'price', 'tutar', 'cena', 'preis', 'birim fiyat'],
  taxRate: ['kdv', 'ddv', 'vat', 'tax', 'vergi', 'oran'],
};

interface Supplier {
  id: string;
  name: string;
  taxId?: string;
}

interface Branch {
  id: string;
  name?: string;
  isActive?: boolean;
}

interface Product {
  id: string;
  name: string;
  code?: string;
  barcode?: string;
  supplierMappings?: Record<string, any>;
}

interface ParsedItem {
  id: string;
  rowNumber: number;
  supplierCode?: string;
  ourCode?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
  matchedProductId?: string;
  matchedProductName?: string;
  matchStatus: 'matched' | 'suggested' | 'unmatched';
  // Son fiyat karşılaştırması
  lastPrice?: number;
  lastPriceWithExpense?: number;
  priceChange?: number; // Yüzde değişim
  priceDirection?: 'up' | 'down' | 'same' | 'new';
  // Masraf dağıtımı
  expenseShare?: number; // Ürüne düşen masraf payı
  unitExpense?: number; // Birim başına masraf
  finalPrice?: number; // Masraf dahil birim fiyat
}

interface ColumnMapping {
  supplierCode: number | null;
  ourCode: number | null;
  productName: number | null;
  quantity: number | null;
  unit: number | null;
  unitPrice: number | null;
  taxRate: number | null;
}

interface ExcelInvoiceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExcelInvoiceImportDialog({ open, onOpenChange, onSuccess }: ExcelInvoiceImportDialogProps) {
  // State
  const [step, setStep] = useState<'config' | 'upload' | 'review'>('config');
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    supplierCode: null,
    ourCode: null,
    productName: null,
    quantity: null,
    unit: null,
    unitPrice: null,
    taxRate: null,
  });
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Configuration
  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [transportCost, setTransportCost] = useState(0);
  const [customsCost, setCustomsCost] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [defaultTaxRate, setDefaultTaxRate] = useState(22);

  // Data from Firebase
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Load data
  useEffect(() => {
    const unsubSuppliers = subscribeToRTDB('partners', (data) => {
      if (data) {
        const supplierList = data
          .filter((p: any) => {
            // Tedarikçi kontrolü: type.isSupplier veya basic.partnerTypes.isSupplier
            const isSupplier = p.type?.isSupplier || p.basic?.partnerTypes?.isSupplier;
            const isDeleted = p.basic?.status === 'deleted';
            return isSupplier && !isDeleted;
          })
          .map((p: any) => ({
            id: p.id || p._id,
            name: p.basic?.name || p.name || p.companyName || '',
            taxId: p.tax?.taxId || p.financial?.vatNumber || p.taxNumber || '',
          }))
          .filter((s: Supplier) => s.name);
        supplierList.sort((a: Supplier, b: Supplier) => a.name.localeCompare(b.name));
        setSuppliers(supplierList);
      }
    });

    const unsubBranches = subscribeToBranches((data) => {
      setBranches(data || []);
    });

    const unsubProducts = subscribeToRTDB('products', (data) => {
      if (data) {
        setProducts(data.map((p: any) => ({
          id: p.id || p._id,
          name: p.name || p.productName || '',
          code: p.code || p.sku || '',
          barcode: p.barcode || '',
          supplierMappings: p.supplierMappings || {},
        })));
      }
    });

    return () => {
      unsubSuppliers();
      unsubBranches();
      unsubProducts();
    };
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('config');
      setFile(null);
      setParsedItems([]);
      setHeaders([]);
      setColumnMapping({
        supplierCode: null,
        ourCode: null,
        productName: null,
        quantity: null,
        unit: null,
        unitPrice: null,
        taxRate: null,
      });
      setBranchId('');
      setSupplierId('');
      setInvoiceNo('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setTransportCost(0);
      setCustomsCost(0);
      setOtherExpenses(0);
    }
  }, [open]);

  // Set due date when invoice date changes
  useEffect(() => {
    if (invoiceDate) {
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + 30);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [invoiceDate]);

  // Auto-detect column mapping
  const detectColumns = useCallback((headerRow: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      supplierCode: null,
      ourCode: null,
      productName: null,
      quantity: null,
      unit: null,
      unitPrice: null,
      taxRate: null,
    };

    headerRow.forEach((header, index) => {
      const headerLower = header.toLowerCase().trim();

      for (const [key, keywords] of Object.entries(COLUMN_KEYWORDS)) {
        if (keywords.some(kw => headerLower.includes(kw))) {
          if (mapping[key as keyof ColumnMapping] === null) {
            mapping[key as keyof ColumnMapping] = index;
          }
        }
      }
    });

    return mapping;
  }, []);

  // Match product helper - supplierMatcher kullanarak
  const matchProduct = useCallback(async (
    item: Partial<ParsedItem>,
    productList: Product[],
    currentSupplierId: string
  ): Promise<Partial<ParsedItem>> => {
    let result: Partial<ParsedItem> = { ...item, matchStatus: 'unmatched' };

    // 1. Try to match by our code first (Bizim Sifra)
    if (item.ourCode) {
      const matchByOurCode = await supplierMatcher.searchByOurCode(item.ourCode);
      if (matchByOurCode) {
        result = {
          ...item,
          matchedProductId: matchByOurCode.id,
          matchedProductName: matchByOurCode.basic?.name || matchByOurCode.name || '',
          matchStatus: 'matched',
        };
      }
    }

    // 2. Try to match by supplier code (Tedarikci Kodu)
    if (result.matchStatus !== 'matched' && item.supplierCode && currentSupplierId) {
      const matchBySupplierCode = await supplierMatcher.search(currentSupplierId, item.supplierCode);
      if (matchBySupplierCode) {
        result = {
          ...item,
          matchedProductId: matchBySupplierCode.productId,
          matchedProductName: matchBySupplierCode.productName,
          matchStatus: 'matched',
          // Son fiyat bilgisi
          lastPrice: matchBySupplierCode.lastPrice,
          lastPriceWithExpense: matchBySupplierCode.lastPriceWithExpense,
        };
      }
    }

    // 3. Try fuzzy name match (fallback)
    if (result.matchStatus !== 'matched' && item.productName) {
      const itemNameLower = item.productName.toLowerCase();
      const fuzzyMatch = productList.find(p =>
        p.name.toLowerCase().includes(itemNameLower) ||
        itemNameLower.includes(p.name.toLowerCase())
      );
      if (fuzzyMatch) {
        result = {
          ...item,
          matchedProductId: fuzzyMatch.id,
          matchedProductName: fuzzyMatch.name,
          matchStatus: 'suggested',
        };
      }
    }

    // 4. Calculate price change if we have last price
    if (result.lastPrice && result.lastPrice > 0 && item.unitPrice) {
      const priceInfo = supplierMatcher.calculatePriceChange(result.lastPrice, item.unitPrice);
      result.priceChange = priceInfo.percent;
      result.priceDirection = priceInfo.direction;
    } else if (result.matchStatus === 'matched') {
      result.priceDirection = 'new'; // İlk alış
    }

    return result;
  }, []);

  // Parse Excel file
  const parseExcelFile = useCallback(async (fileContent: ArrayBuffer) => {
    const workbook = XLSX.read(fileContent, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (data.length < 2) {
      throw new Error('Excel dosyasi bos veya sadece baslik satiri var');
    }

    // First row is headers
    const headerRow = data[0].map(h => String(h || ''));
    setHeaders(headerRow);

    // Auto-detect columns
    const detectedMapping = detectColumns(headerRow);
    setColumnMapping(detectedMapping);

    // Parse data rows
    const items: ParsedItem[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }

      const getValue = (colIndex: number | null): any => {
        if (colIndex === null || colIndex === undefined) return null;
        return row[colIndex];
      };

      const supplierCode = getValue(detectedMapping.supplierCode)?.toString() || '';
      const ourCode = getValue(detectedMapping.ourCode)?.toString() || '';
      const productName = getValue(detectedMapping.productName)?.toString() || `Satir ${i + 1}`;
      const quantity = parseFloat(getValue(detectedMapping.quantity)) || 1;
      const unit = getValue(detectedMapping.unit)?.toString() || 'KG';
      const unitPrice = parseFloat(getValue(detectedMapping.unitPrice)) || 0;
      const taxRate = parseFloat(getValue(detectedMapping.taxRate)) || defaultTaxRate;

      const lineTotal = quantity * unitPrice;

      const item: ParsedItem = {
        id: `item-${i}`,
        rowNumber: i + 1,
        supplierCode,
        ourCode,
        productName,
        quantity,
        unit,
        unitPrice,
        taxRate,
        lineTotal,
        matchStatus: 'unmatched',
      };

      // Try to match product (async)
      const matched = await matchProduct(item, products, supplierId);
      items.push(matched as ParsedItem);
    }

    // Tedarikçi eşleştirmelerini önceden yükle
    if (supplierId) {
      await supplierMatcher.loadSupplierMappings(supplierId);
    }

    return items;
  }, [detectColumns, matchProduct, products, supplierId, defaultTaxRate]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) {
      toast.error('Lutfen bir Excel dosyasi secin (.xlsx, .xls, .csv)');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const content = await selectedFile.arrayBuffer();
      const items = await parseExcelFile(content);

      setParsedItems(items);
      setStep('review');
      toast.success(`Excel basariyla okundu: ${items.length} kalem`);
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error('Excel dosyasi okunamadi: ' + (error as Error).message);
    } finally {
      setParsing(false);
    }
  };

  // Re-match products when supplier changes
  const rematchProducts = useCallback(async () => {
    // Tedarikçi eşleştirmelerini yükle
    if (supplierId) {
      await supplierMatcher.loadSupplierMappings(supplierId);
    }

    const rematchedItems: ParsedItem[] = [];
    for (const item of parsedItems) {
      const matched = await matchProduct(item, products, supplierId);
      rematchedItems.push(matched as ParsedItem);
    }
    setParsedItems(rematchedItems);
  }, [parsedItems, products, supplierId, matchProduct]);

  // Update item product match
  const updateItemMatch = (itemId: string, productId: string) => {
    const actualProductId = productId === 'none' ? '' : productId;
    const product = products.find(p => p.id === actualProductId);
    const updatedItems = parsedItems.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        matchedProductId: actualProductId || undefined,
        matchedProductName: product?.name || '',
        matchStatus: actualProductId ? 'matched' as const : 'unmatched' as const,
      };
    });
    setParsedItems(updatedItems);
  };

  // Calculate totals
  const subtotal = parsedItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const totalTax = parsedItems.reduce((sum, i) => sum + (i.lineTotal * i.taxRate / 100), 0);
  const totalExpenses = transportCost + customsCost + otherExpenses;
  const grandTotal = subtotal + totalTax + totalExpenses;

  // Masraf dağıtımını hesapla (orantılı - pro-rata)
  const calculateExpenseDistribution = useCallback(() => {
    if (subtotal === 0 || totalExpenses === 0) return parsedItems;

    return parsedItems.map(item => {
      // Masraf payı = (Ürün tutarı / Toplam) × Toplam Masraf
      const expenseShare = (item.lineTotal / subtotal) * totalExpenses;
      // Birim başına masraf = Masraf payı / Miktar
      const unitExpense = item.quantity > 0 ? expenseShare / item.quantity : 0;
      // Masraf dahil birim fiyat
      const finalPrice = item.unitPrice + unitExpense;

      return {
        ...item,
        expenseShare,
        unitExpense,
        finalPrice,
      };
    });
  }, [parsedItems, subtotal, totalExpenses]);

  // Masraf dağıtımlı ürünler
  const itemsWithExpenses = calculateExpenseDistribution();

  // Stats
  const matchedCount = parsedItems.filter(i => i.matchStatus === 'matched').length;
  const suggestedCount = parsedItems.filter(i => i.matchStatus === 'suggested').length;
  const unmatchedCount = parsedItems.filter(i => i.matchStatus === 'unmatched').length;
  const matchPercentage = parsedItems.length > 0 ? Math.round((matchedCount / parsedItems.length) * 100) : 0;

  // Save invoice
  const handleSave = async () => {
    if (!branchId) {
      toast.error('Lutfen sube secin');
      return;
    }
    if (!supplierId) {
      toast.error('Lutfen tedarikci secin');
      return;
    }
    if (!invoiceNo.trim()) {
      toast.error('Lutfen fatura numarasi girin');
      return;
    }
    if (parsedItems.length === 0) {
      toast.error('Fatura kalemleri bos');
      return;
    }

    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);

      const invoiceData = {
        invoice_number: invoiceNo.trim(),
        invoiceNo: invoiceNo.trim(),
        type: 'purchase',
        invoice_date: invoiceDate,
        date: invoiceDate,
        due_date: dueDate || null,
        dueDate: dueDate || null,
        branch_id: branchId,
        branchId: branchId,
        supplier_id: supplierId,
        supplierId: supplierId,
        supplier_name: supplier?.name || '',
        supplier: supplier?.name || '',
        currency: 'EUR',
        items: parsedItems.map(item => ({
          product_id: item.matchedProductId || null,
          productId: item.matchedProductId || null,
          name: item.productName,
          description: item.productName,
          supplier_code: item.supplierCode || null,
          our_code: item.ourCode || null,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          unitPrice: item.unitPrice,
          tax_rate: item.taxRate,
          ddvRate: item.taxRate,
          tax_amount: item.lineTotal * item.taxRate / 100,
          ddvAmount: item.lineTotal * item.taxRate / 100,
          line_total: item.lineTotal + (item.lineTotal * item.taxRate / 100),
          total: item.lineTotal + (item.lineTotal * item.taxRate / 100),
        })),
        subtotal: subtotal,
        total_tax: totalTax,
        vatAmount: totalTax,
        transport_cost: transportCost,
        customs_cost: customsCost,
        other_expenses: otherExpenses,
        total_expense: totalExpenses,
        grand_total: grandTotal,
        total: grandTotal,
        status: 'pending',
        paymentStatus: 'unpaid',
        importSource: 'Excel',
        matchingStats: {
          totalItems: parsedItems.length,
          matchedItems: matchedCount,
          matchPercentage,
        },
        notes: `Excel import: ${file?.name}`,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      await addFirestoreData('purchases', invoiceData);
      toast.success('Fatura basariyla eklendi');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Kaydetme hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Download Excel template
  const downloadTemplate = () => {
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();

      // Template headers
      const headers = ['Tedarikci Kodu', 'Bizim Sifra', 'Urun Adi', 'Miktar', 'Birim', 'Birim Fiyat', 'KDV %'];

      // Example data
      const exampleData = [
        ['P001', 'URN-001', 'Dana Kiyma', 10, 'KG', 12.50, 9.5],
        ['P002', 'URN-002', 'Sut 1L', 20, 'AD', 1.50, 9.5],
        ['P003', 'URN-003', 'Ekmek', 50, 'AD', 0.80, 9.5],
      ];

      // Create worksheet data with headers and examples
      const wsData = [headers, ...exampleData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 18 }, // Tedarikci Kodu
        { wch: 15 }, // Bizim Sifra
        { wch: 30 }, // Urun Adi
        { wch: 10 }, // Miktar
        { wch: 8 },  // Birim
        { wch: 12 }, // Birim Fiyat
        { wch: 8 },  // KDV %
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Alis Faturasi');

      // Generate filename with date
      const today = new Date().toISOString().split('T')[0];
      const filename = `Alis_Faturasi_Sablonu_${today}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      toast.success('Excel sablonu indirildi: ' + filename);
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Sablon indirme hatasi: ' + (error as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Fatura Iceri Aktar
          </DialogTitle>
        </DialogHeader>

        {/* Step: Config - Select supplier and branch first */}
        {step === 'config' && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Oncelikle Tedarikci ve Sube Secin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tedarikci *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger>
                        <Building2 className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Tedarikci secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.filter(s => s.id).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sube *</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger>
                        <Store className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sube secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.filter(b => b.id && b.isActive !== false).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Fatura No *</Label>
                    <Input
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="ALI-2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fatura Tarihi</Label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vade Tarihi</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Beklenen Excel Formati</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Excel dosyanizda asagidaki sutunlar otomatik algilanir:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Tedarikci Kodu:</strong> tedarikci, supplier, partner, kod</li>
                    <li><strong>Bizim Sifra:</strong> bizim, sifra, kod, sku</li>
                    <li><strong>Urun Adi:</strong> urun, product, ad, name, aciklama</li>
                    <li><strong>Miktar:</strong> miktar, quantity, qty, adet</li>
                    <li><strong>Birim:</strong> birim, unit</li>
                    <li><strong>Birim Fiyat:</strong> fiyat, price, tutar</li>
                    <li><strong>KDV %:</strong> kdv, ddv, vat, tax</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep('upload')}
                disabled={!supplierId || !branchId || !invoiceNo.trim()}
              >
                Devam - Dosya Sec
              </Button>
            </div>
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            {/* Template Download Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Excel Sablonu</p>
                      <p className="text-sm text-blue-700">
                        Dogru formatta veri yuklemek icin sablonu indirin
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sablon Indir
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload Section */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Excel Dosyasi Secin</p>
              <p className="text-sm text-muted-foreground mb-4">
                .xlsx, .xls veya .csv dosyasi yukleyin
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
                disabled={parsing}
              />
              {parsing && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Excel okunuyor...</span>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('config')}>
                Geri
              </Button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="space-y-4 py-4">
            {/* Matching Stats */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Urun Eslestirme</span>
                      <span className="text-sm font-medium">{matchPercentage}%</span>
                    </div>
                    <Progress value={matchPercentage} className="h-2" />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{matchedCount} Eslesti</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>{suggestedCount} Oneri</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{unmatchedCount} Eslesmedi</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={rematchProducts}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Yeniden Esle
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fatura Kalemleri ({parsedItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Tedarikci Kodu</TableHead>
                        <TableHead>Bizim Sifra</TableHead>
                        <TableHead>Urun Adi</TableHead>
                        <TableHead className="text-right">Miktar</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead className="text-right">Fiyat</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                        <TableHead>Eslesen Urun</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedItems.map((item) => (
                        <TableRow key={item.id} className={
                          item.matchStatus === 'matched' ? 'bg-green-50' :
                          item.matchStatus === 'suggested' ? 'bg-yellow-50' : 'bg-red-50'
                        }>
                          <TableCell>
                            {item.matchStatus === 'matched' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {item.matchStatus === 'suggested' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {item.matchStatus === 'unmatched' && <XCircle className="h-4 w-4 text-red-500" />}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.rowNumber}</TableCell>
                          <TableCell className="font-mono text-xs">{item.supplierCode || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{item.ourCode || '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right font-mono">{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-medium">{item.lineTotal.toFixed(2)}</TableCell>
                          <TableCell>
                            <Select
                              value={item.matchedProductId || 'none'}
                              onValueChange={(value) => updateItemMatch(item.id, value === 'none' ? '' : value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Urun sec..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Secim yok --</SelectItem>
                                {products.filter(p => p.id).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ek Masraflar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Nakliye (EUR)
                    </Label>
                    <Input
                      type="number"
                      value={transportCost}
                      onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Gumruk (EUR)
                    </Label>
                    <Input
                      type="number"
                      value={customsCost}
                      onChange={(e) => setCustomsCost(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Diger Masraflar (EUR)</Label>
                    <Input
                      type="number"
                      value={otherExpenses}
                      onChange={(e) => setOtherExpenses(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ara Toplam (KDV Haric):</span>
                  <span className="font-mono">{subtotal.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KDV Toplam:</span>
                  <span className="font-mono">{totalTax.toFixed(2)} EUR</span>
                </div>
                {totalExpenses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ek Masraflar:</span>
                    <span className="font-mono">+{totalExpenses.toFixed(2)} EUR</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-1 text-lg">
                  <span>Genel Toplam:</span>
                  <span className="font-mono text-primary">{grandTotal.toFixed(2)} EUR</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Geri
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Fatura Olustur
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
