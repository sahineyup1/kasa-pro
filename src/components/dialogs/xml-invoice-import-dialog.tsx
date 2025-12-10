'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Upload, CheckCircle, XCircle, AlertTriangle,
  Store, Building2, Truck, Package, RefreshCw, Search
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
  DialogFooter,
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
import { toast } from 'sonner';

// Supported XML formats
const SUPPORTED_FORMATS = {
  'eslog': { name: 'eSLOG 2.0 (Slovenya)', country: 'SI' },
  'ebinterface': { name: 'ebInterface (Avusturya)', country: 'AT' },
  'xrechnung': { name: 'XRechnung (Almanya)', country: 'DE' },
  'zugferd': { name: 'ZUGFeRD (Almanya)', country: 'DE' },
  'ubl-tr': { name: 'UBL-TR (Turkiye)', country: 'TR' },
  'ubl': { name: 'UBL 2.1', country: 'EU' },
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
  supplierCode?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  matchedProductId?: string;
  matchedProductName?: string;
  matchStatus: 'matched' | 'suggested' | 'unmatched';
}

interface ParsedInvoice {
  format: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  supplier: {
    name: string;
    taxId?: string;
    address?: string;
  };
  items: ParsedItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
}

interface XMLInvoiceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function XMLInvoiceImportDialog({ open, onOpenChange, onSuccess }: XMLInvoiceImportDialogProps) {
  // State
  const [step, setStep] = useState<'upload' | 'review' | 'configure'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Configuration
  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [transportCost, setTransportCost] = useState(0);
  const [customsCost, setCustomsCost] = useState(0);

  // Data from Firebase
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Load data
  useEffect(() => {
    const unsubSuppliers = subscribeToRTDB('partners', (data) => {
      if (data) {
        const supplierList = data
          .filter((p: any) => p.basic?.type === 'supplier' || p.type === 'supplier')
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
      setStep('upload');
      setFile(null);
      setParsedInvoice(null);
      setBranchId('');
      setSupplierId('');
      setTransportCost(0);
      setCustomsCost(0);
    }
  }, [open]);

  // Parse XML file
  const parseXMLFile = useCallback(async (xmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Gecersiz XML dosyasi');
    }

    // Detect format
    const rootElement = doc.documentElement;
    const rootName = rootElement.tagName.toLowerCase();
    const namespace = rootElement.getAttribute('xmlns') || '';

    let format = 'unknown';
    if (namespace.includes('eslog') || namespace.includes('gzs.si')) {
      format = 'eslog';
    } else if (namespace.includes('ebinterface')) {
      format = 'ebinterface';
    } else if (namespace.includes('ubl') && namespace.includes('Invoice')) {
      format = rootName.includes('tr') ? 'ubl-tr' : 'ubl';
    } else if (namespace.includes('CrossIndustryInvoice') || namespace.includes('zugferd')) {
      format = 'zugferd';
    } else if (rootName.includes('invoice') || rootName.includes('rechnung')) {
      format = 'xrechnung';
    }

    // Parse based on format - simplified universal parser
    const getText = (selectors: string[]): string => {
      for (const selector of selectors) {
        const el = doc.querySelector(selector);
        if (el?.textContent) return el.textContent.trim();
      }
      return '';
    };

    const getNumber = (selectors: string[]): number => {
      const text = getText(selectors);
      return parseFloat(text.replace(',', '.')) || 0;
    };

    // Extract invoice header
    const invoiceNumber = getText([
      'InvoiceNumber', 'ID', 'cbc\\:ID', 'InvoiceId', 'Racun', 'RacunStevilka',
      'Invoice > ID', 'Invoice ID', 'DocumentNumber'
    ]) || `IMP-${Date.now()}`;

    const invoiceDate = getText([
      'InvoiceDate', 'IssueDate', 'cbc\\:IssueDate', 'DatumRacuna', 'DatumIzdaje',
      'Invoice > IssueDate', 'DocumentDate'
    ]) || new Date().toISOString().split('T')[0];

    const dueDate = getText([
      'DueDate', 'PaymentDueDate', 'cbc\\:DueDate', 'DatumValute',
      'Payment > DueDate'
    ]);

    const currency = getText([
      'Currency', 'DocumentCurrencyCode', 'cbc\\:DocumentCurrencyCode', 'Valuta'
    ]) || 'EUR';

    // Extract supplier info
    const supplierName = getText([
      'SellerParty Name', 'AccountingSupplierParty PartyName Name',
      'cac\\:AccountingSupplierParty cac\\:Party cac\\:PartyName cbc\\:Name',
      'Supplier Name', 'Dobavitelj Naziv', 'SupplierParty Name',
      'Biller Name', 'PayeeParty Name'
    ]);

    const supplierTaxId = getText([
      'SellerParty TaxNumber', 'AccountingSupplierParty PartyTaxScheme CompanyID',
      'cac\\:AccountingSupplierParty cac\\:PartyTaxScheme cbc\\:CompanyID',
      'Supplier VATNumber', 'Dobavitelj IDzaDDV', 'SupplierParty VATNumber',
      'Biller VATIdentificationNumber'
    ]);

    // Extract items
    const itemElements = doc.querySelectorAll(
      'InvoiceLine, cac\\:InvoiceLine, Postavka, LineItem, Item, Line'
    );

    const items: ParsedItem[] = [];
    let itemIndex = 0;

    itemElements.forEach((itemEl) => {
      const getItemText = (selectors: string[]): string => {
        for (const selector of selectors) {
          const el = itemEl.querySelector(selector);
          if (el?.textContent) return el.textContent.trim();
        }
        return '';
      };

      const getItemNumber = (selectors: string[]): number => {
        const text = getItemText(selectors);
        return parseFloat(text.replace(',', '.')) || 0;
      };

      const description = getItemText([
        'Item Name', 'cbc\\:Name', 'Description', 'cbc\\:Description',
        'Naziv', 'ItemName', 'ProductName', 'Opis'
      ]) || `Kalem ${itemIndex + 1}`;

      const supplierCode = getItemText([
        'SellersItemIdentification ID', 'cac\\:SellersItemIdentification cbc\\:ID',
        'SupplierCode', 'ItemCode', 'Sifra', 'SKU'
      ]);

      const quantity = getItemNumber([
        'InvoicedQuantity', 'cbc\\:InvoicedQuantity', 'Quantity',
        'Kolicina', 'Qty', 'Amount'
      ]) || 1;

      const unit = getItemText([
        'InvoicedQuantity unitCode', 'cbc\\:InvoicedQuantity',
        'UnitCode', 'Enota', 'Unit'
      ]) || 'KOM';

      const unitPrice = getItemNumber([
        'Price PriceAmount', 'cac\\:Price cbc\\:PriceAmount',
        'UnitPrice', 'Cena', 'NetPrice'
      ]);

      const taxRate = getItemNumber([
        'TaxCategory Percent', 'cac\\:TaxCategory cbc\\:Percent',
        'VATRate', 'DDVStopnja', 'TaxPercent'
      ]) || 22;

      const lineTotal = getItemNumber([
        'LineExtensionAmount', 'cbc\\:LineExtensionAmount',
        'Amount', 'Znesek', 'TotalAmount'
      ]) || (quantity * unitPrice);

      const taxAmount = lineTotal * (taxRate / 100);

      items.push({
        id: `item-${itemIndex}`,
        supplierCode,
        description,
        quantity,
        unit: normalizeUnit(unit),
        unitPrice,
        taxRate,
        taxAmount,
        lineTotal: lineTotal + taxAmount,
        matchStatus: 'unmatched',
      });

      itemIndex++;
    });

    // If no items found, create a placeholder
    if (items.length === 0) {
      items.push({
        id: 'item-0',
        description: 'Manuel giris gerekli',
        quantity: 1,
        unit: 'KOM',
        unitPrice: 0,
        taxRate: 22,
        taxAmount: 0,
        lineTotal: 0,
        matchStatus: 'unmatched',
      });
    }

    // Extract totals
    const subtotal = getNumber([
      'TaxExclusiveAmount', 'cbc\\:TaxExclusiveAmount', 'LegalMonetaryTotal TaxExclusiveAmount',
      'Subtotal', 'NetAmount', 'ZnesekBrezDDV'
    ]) || items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

    const totalTax = getNumber([
      'TaxAmount', 'cbc\\:TaxAmount', 'TaxTotal TaxAmount',
      'VATAmount', 'DDVZnesek'
    ]) || items.reduce((sum, i) => sum + i.taxAmount, 0);

    const grandTotal = getNumber([
      'PayableAmount', 'cbc\\:PayableAmount', 'LegalMonetaryTotal PayableAmount',
      'TaxInclusiveAmount', 'GrandTotal', 'Total', 'SkupajZDDV'
    ]) || (subtotal + totalTax);

    return {
      format,
      invoiceNumber,
      invoiceDate: formatDateString(invoiceDate),
      dueDate: dueDate ? formatDateString(dueDate) : undefined,
      currency,
      supplier: {
        name: supplierName,
        taxId: supplierTaxId,
      },
      items,
      subtotal,
      totalTax,
      grandTotal,
    };
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.xml')) {
      toast.error('Lutfen bir XML dosyasi secin');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const content = await selectedFile.text();
      const parsed = await parseXMLFile(content);

      // Auto-match supplier by tax ID
      if (parsed.supplier.taxId) {
        const matchedSupplier = suppliers.find(s =>
          s.taxId?.replace(/[^a-zA-Z0-9]/g, '') === parsed.supplier.taxId?.replace(/[^a-zA-Z0-9]/g, '')
        );
        if (matchedSupplier) {
          setSupplierId(matchedSupplier.id);
        }
      }

      // Auto-match products
      const matchedItems = parsed.items.map(item => matchProduct(item, products, supplierId));
      parsed.items = matchedItems;

      setParsedInvoice(parsed);
      setStep('review');
      toast.success(`XML basariyla okundu: ${parsed.items.length} kalem`);
    } catch (error) {
      console.error('XML parse error:', error);
      toast.error('XML dosyasi okunamadi: ' + (error as Error).message);
    } finally {
      setParsing(false);
    }
  };

  // Match product helper
  const matchProduct = (item: ParsedItem, productList: Product[], currentSupplierId: string): ParsedItem => {
    // Try to match by supplier code
    if (item.supplierCode && currentSupplierId) {
      const matchByCode = productList.find(p =>
        p.supplierMappings?.[currentSupplierId]?.code === item.supplierCode
      );
      if (matchByCode) {
        return {
          ...item,
          matchedProductId: matchByCode.id,
          matchedProductName: matchByCode.name,
          matchStatus: 'matched',
        };
      }
    }

    // Try fuzzy name match
    const itemNameLower = item.description.toLowerCase();
    const fuzzyMatch = productList.find(p =>
      p.name.toLowerCase().includes(itemNameLower) ||
      itemNameLower.includes(p.name.toLowerCase())
    );
    if (fuzzyMatch) {
      return {
        ...item,
        matchedProductId: fuzzyMatch.id,
        matchedProductName: fuzzyMatch.name,
        matchStatus: 'suggested',
      };
    }

    return item;
  };

  // Re-match products when supplier changes
  useEffect(() => {
    if (parsedInvoice && supplierId) {
      const rematchedItems = parsedInvoice.items.map(item =>
        matchProduct(item, products, supplierId)
      );
      setParsedInvoice({ ...parsedInvoice, items: rematchedItems });
    }
  }, [supplierId]);

  // Update item product match
  const updateItemMatch = (itemId: string, productId: string) => {
    if (!parsedInvoice) return;

    const product = products.find(p => p.id === productId);
    const updatedItems = parsedInvoice.items.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        matchedProductId: productId,
        matchedProductName: product?.name || '',
        matchStatus: 'matched' as const,
      };
    });

    setParsedInvoice({ ...parsedInvoice, items: updatedItems });
  };

  // Calculate totals with expenses
  const totalWithExpenses = (parsedInvoice?.grandTotal || 0) + transportCost + customsCost;

  // Stats
  const matchedCount = parsedInvoice?.items.filter(i => i.matchStatus === 'matched').length || 0;
  const suggestedCount = parsedInvoice?.items.filter(i => i.matchStatus === 'suggested').length || 0;
  const unmatchedCount = parsedInvoice?.items.filter(i => i.matchStatus === 'unmatched').length || 0;
  const matchPercentage = parsedInvoice ? Math.round((matchedCount / parsedInvoice.items.length) * 100) : 0;

  // Save invoice
  const handleSave = async () => {
    if (!parsedInvoice || !branchId) {
      toast.error('Lutfen sube secin');
      return;
    }

    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);

      const invoiceData = {
        invoice_number: parsedInvoice.invoiceNumber,
        invoiceNo: parsedInvoice.invoiceNumber,
        type: 'purchase',
        invoice_date: parsedInvoice.invoiceDate,
        date: parsedInvoice.invoiceDate,
        due_date: parsedInvoice.dueDate || null,
        dueDate: parsedInvoice.dueDate || null,
        branch_id: branchId,
        branchId: branchId,
        supplier_id: supplierId || null,
        supplierId: supplierId || null,
        supplier_name: supplier?.name || parsedInvoice.supplier.name,
        supplier: supplier?.name || parsedInvoice.supplier.name,
        currency: parsedInvoice.currency,
        items: parsedInvoice.items.map(item => ({
          product_id: item.matchedProductId || null,
          productId: item.matchedProductId || null,
          name: item.description,
          description: item.description,
          supplier_code: item.supplierCode || null,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          unitPrice: item.unitPrice,
          tax_rate: item.taxRate,
          ddvRate: item.taxRate,
          tax_amount: item.taxAmount,
          ddvAmount: item.taxAmount,
          line_total: item.lineTotal,
          total: item.lineTotal,
        })),
        subtotal: parsedInvoice.subtotal,
        total_tax: parsedInvoice.totalTax,
        vatAmount: parsedInvoice.totalTax,
        transport_cost: transportCost,
        customs_cost: customsCost,
        total_expense: transportCost + customsCost,
        grand_total: totalWithExpenses,
        total: totalWithExpenses,
        status: 'pending',
        paymentStatus: 'unpaid',
        importSource: `XML - ${SUPPORTED_FORMATS[parsedInvoice.format as keyof typeof SUPPORTED_FORMATS]?.name || parsedInvoice.format}`,
        matchingStats: {
          totalItems: parsedInvoice.items.length,
          matchedItems: matchedCount,
          matchPercentage,
        },
        notes: `XML import: ${file?.name}`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            XML Fatura Iceri Aktar
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Desteklenen Formatlar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {Object.entries(SUPPORTED_FORMATS).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {val.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">XML Dosyasi Secin</p>
              <p className="text-sm text-muted-foreground mb-4">
                e-Fatura XML dosyasini yukleyin
              </p>
              <Input
                type="file"
                accept=".xml"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
                disabled={parsing}
              />
              {parsing && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>XML okunuyor...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && parsedInvoice && (
          <div className="space-y-4 py-4">
            {/* Invoice Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fatura Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Format:</span>
                    <p className="font-medium">
                      {SUPPORTED_FORMATS[parsedInvoice.format as keyof typeof SUPPORTED_FORMATS]?.name || parsedInvoice.format}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fatura No:</span>
                    <p className="font-medium">{parsedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tarih:</span>
                    <p className="font-medium">{parsedInvoice.invoiceDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tedarikci:</span>
                    <p className="font-medium">{parsedInvoice.supplier.name || '-'}</p>
                    {parsedInvoice.supplier.taxId && (
                      <p className="text-xs text-muted-foreground">{parsedInvoice.supplier.taxId}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fatura Kalemleri ({parsedInvoice.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead>Tedarikci Kodu</TableHead>
                        <TableHead>Aciklama</TableHead>
                        <TableHead className="text-right">Miktar</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead className="text-right">Fiyat</TableHead>
                        <TableHead className="text-right">KDV %</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                        <TableHead>Eslesen Urun</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedInvoice.items.map((item) => (
                        <TableRow key={item.id} className={
                          item.matchStatus === 'matched' ? 'bg-green-50' :
                          item.matchStatus === 'suggested' ? 'bg-yellow-50' : 'bg-red-50'
                        }>
                          <TableCell>
                            {item.matchStatus === 'matched' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {item.matchStatus === 'suggested' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {item.matchStatus === 'unmatched' && <XCircle className="h-4 w-4 text-red-500" />}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.supplierCode || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right font-mono">{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.taxRate}%</TableCell>
                          <TableCell className="text-right font-mono font-medium">{item.lineTotal.toFixed(2)}</TableCell>
                          <TableCell>
                            <Select
                              value={item.matchedProductId || ''}
                              onValueChange={(value) => updateItemMatch(item.id, value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Urun sec..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">-- Secim yok --</SelectItem>
                                {products.map((p) => (
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

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ara Toplam:</span>
                  <span className="font-mono">{parsedInvoice.subtotal.toFixed(2)} {parsedInvoice.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KDV:</span>
                  <span className="font-mono">{parsedInvoice.totalTax.toFixed(2)} {parsedInvoice.currency}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Genel Toplam:</span>
                  <span className="font-mono">{parsedInvoice.grandTotal.toFixed(2)} {parsedInvoice.currency}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Geri
              </Button>
              <Button onClick={() => setStep('configure')}>
                Devam
              </Button>
            </div>
          </div>
        )}

        {/* Step: Configure */}
        {step === 'configure' && parsedInvoice && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Configuration */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sube *</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <Store className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sube secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.filter(b => b.isActive !== false).map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tedarikci</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tedarikci secin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Secim yok --</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.taxId && <span className="text-xs text-muted-foreground ml-1">({s.taxId})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parsedInvoice.supplier.name && !supplierId && (
                    <p className="text-xs text-muted-foreground">
                      XML'den: {parsedInvoice.supplier.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Nakliye Masrafi (EUR)
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
                    Gumruk Masrafi (EUR)
                  </Label>
                  <Input
                    type="number"
                    value={customsCost}
                    onChange={(e) => setCustomsCost(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Right: Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fatura Ozeti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fatura No:</span>
                      <span className="font-medium">{parsedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tarih:</span>
                      <span>{parsedInvoice.invoiceDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kalem Sayisi:</span>
                      <span>{parsedInvoice.items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eslesen:</span>
                      <span className="text-green-600">{matchedCount} / {parsedInvoice.items.length}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fatura Toplami:</span>
                      <span className="font-mono">{parsedInvoice.grandTotal.toFixed(2)} EUR</span>
                    </div>
                    {transportCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nakliye:</span>
                        <span className="font-mono">+{transportCost.toFixed(2)} EUR</span>
                      </div>
                    )}
                    {customsCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gumruk:</span>
                        <span className="font-mono">+{customsCost.toFixed(2)} EUR</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Genel Toplam:</span>
                      <span className="text-primary font-mono">{totalWithExpenses.toFixed(2)} EUR</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('review')}>
                Geri
              </Button>
              <Button onClick={handleSave} disabled={saving || !branchId}>
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

// Helper functions
function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'C62': 'KOM',
    'EA': 'KOM',
    'PCE': 'KOM',
    'KGM': 'KG',
    'LTR': 'LT',
    'MTR': 'M',
    'MTK': 'M2',
    'H87': 'KOM',
  };
  return unitMap[unit.toUpperCase()] || unit;
}

function formatDateString(dateStr: string): string {
  // Try to parse and format date
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        return dateStr.substring(0, 10);
      } else {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  return dateStr;
}
