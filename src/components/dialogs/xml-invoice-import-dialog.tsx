'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Upload, CheckCircle, XCircle, AlertTriangle,
  Store, Building2, Truck, Package, RefreshCw
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
import { toast } from 'sonner';

// Supported XML formats
const SUPPORTED_FORMATS: Record<string, { name: string; country: string }> = {
  'eslog': { name: 'eSLOG 2.0 (Slovenya)', country: 'SI' },
  'ebinterface': { name: 'ebInterface (Avusturya)', country: 'AT' },
  'xrechnung': { name: 'XRechnung (Almanya)', country: 'DE' },
  'zugferd': { name: 'ZUGFeRD (Almanya)', country: 'DE' },
  'ubl-tr': { name: 'UBL-TR (Türkiye)', country: 'TR' },
  'ubl': { name: 'UBL 2.1', country: 'EU' },
  'onk-excel': { name: 'ONK Business Central Excel XML', country: 'AT' },
};

// Expense keywords for auto-detection
const EXPENSE_KEYWORDS = {
  transport: ['fracht', 'freight', 'transport', 'nakliye', 'shipping', 'delivery', 'versand', 'spedition', 'lieferung', 'prevoz', 'dostava', 'kargo'],
  customs: ['zoll', 'customs', 'gümrük', 'carina', 'duty', 'import', 'export', 'verzollung'],
  handling: ['handling', 'bearbeitung', 'işlem', 'obdelava', 'manipulation'],
  packaging: ['verpackung', 'packaging', 'ambalaj', 'embalaža', 'paket'],
  insurance: ['versicherung', 'insurance', 'sigorta', 'zavarovanje'],
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
  supplierMappings?: Record<string, { code?: string }>;
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
  isExpense?: boolean;
  expenseType?: string;
}

interface ParsedInvoice {
  format: string;
  country: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  supplier: {
    name: string;
    taxId?: string;
    address?: string;
  };
  customer?: {
    name?: string;
    taxId?: string;
  };
  items: ParsedItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  detectedExpenses: {
    transport: number;
    customs: number;
    other: number;
  };
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
    if (!open) return;

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
          name: p.basic?.name || p.name || p.productName || '',
          code: p.basic?.stockCode || p.code || p.sku || '',
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
  }, [open]);

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

  // Check if item is expense
  const isExpenseItem = (description: string): { isExpense: boolean; expenseType: string } => {
    if (!description) return { isExpense: false, expenseType: '' };
    const descLower = description.toLowerCase();

    for (const [expenseType, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (descLower.includes(keyword)) {
          return { isExpense: true, expenseType };
        }
      }
    }
    return { isExpense: false, expenseType: '' };
  };

  // Detect XML format
  const detectFormat = (doc: Document): { format: string; country: string } => {
    const root = doc.documentElement;
    const rootTag = root.tagName.toLowerCase();
    const rootNs = root.getAttribute('xmlns') || '';
    const allAttrs = Array.from(root.attributes).map(a => a.value.toLowerCase()).join(' ');

    // ONK Business Central Excel XML (mso-application with Excel.Sheet)
    const piNodes = doc.childNodes;
    for (let i = 0; i < piNodes.length; i++) {
      const node = piNodes[i];
      if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE && node.nodeName === 'mso-application') {
        if ((node.nodeValue || '').includes('Excel.Sheet')) {
          return { format: 'onk-excel', country: 'AT' };
        }
      }
    }
    // Also check if root is Workbook with spreadsheet namespace
    if (rootTag === 'workbook' && (rootNs.includes('office:spreadsheet') || rootNs.includes('schemas-microsoft-com:office:spreadsheet'))) {
      return { format: 'onk-excel', country: 'AT' };
    }

    // eSLOG (Slovenia)
    if (rootNs.includes('eslog') || rootNs.includes('urn:eslog') || rootNs.includes('gzs.si') || allAttrs.includes('eslog')) {
      return { format: 'eslog', country: 'SI' };
    }

    // ebInterface (Austria)
    if (rootNs.includes('ebinterface') || allAttrs.includes('ebinterface')) {
      return { format: 'ebinterface', country: 'AT' };
    }

    // ZUGFeRD (Germany)
    if (rootTag.includes('crossindustryinvoice') || rootNs.includes('crossindustryinvoice')) {
      return { format: 'zugferd', country: 'DE' };
    }

    // UBL-TR (Turkey)
    const customization = doc.querySelector('CustomizationID');
    if (customization?.textContent?.includes('TR')) {
      return { format: 'ubl-tr', country: 'TR' };
    }

    // XRechnung (Germany)
    const profileId = doc.querySelector('ProfileID');
    if (profileId?.textContent?.toLowerCase().includes('xrechnung')) {
      return { format: 'xrechnung', country: 'DE' };
    }

    // Generic UBL
    if (rootTag.includes('invoice')) {
      return { format: 'ubl', country: 'EU' };
    }

    return { format: 'unknown', country: 'UNKNOWN' };
  };

  // Parse ONK Excel XML format
  const parseONKExcelXML = (doc: Document): ParsedInvoice => {
    const worksheets = doc.querySelectorAll('Worksheet');
    let invoiceNumber = '';
    let invoiceDate = new Date().toISOString().split('T')[0];
    let customerName = '';
    let customerAddress = '';
    const items: ParsedItem[] = [];
    const detectedExpenses = { transport: 0, customs: 0, other: 0 };

    // Parse Allgemein (General) worksheet for header info
    worksheets.forEach((ws) => {
      const wsName = ws.getAttribute('ss:Name') || '';
      const rows = ws.querySelectorAll('Row');

      if (wsName === 'Allgemein') {
        // Parse header info from Allgemein worksheet
        rows.forEach((row) => {
          const cells = row.querySelectorAll('Cell');
          if (cells.length >= 2) {
            const label = cells[0]?.querySelector('Data')?.textContent?.trim() || '';
            const value = cells[1]?.querySelector('Data')?.textContent?.trim() || '';

            if (label === 'Nr.') {
              invoiceNumber = value;
            } else if (label === 'Verk. an Name') {
              customerName = value;
            } else if (label === 'Verk. an Adresse') {
              customerAddress = value;
            } else if (label === 'Buchungsdatum' || label === 'Belegdatum') {
              // Date format: 2025-11-25T00:00:00.000
              if (value) {
                invoiceDate = value.split('T')[0];
              }
            }
          }
        });
      }

      // Parse line items from the main worksheet (Bearbeiten - ONK...)
      if (wsName.startsWith('Bearbeiten') && !wsName.includes('1')) {
        let headerRow: string[] = [];
        let isHeader = true;
        let itemIndex = 0;

        rows.forEach((row, rowIdx) => {
          const cells = row.querySelectorAll('Cell');
          const cellValues: string[] = [];

          cells.forEach((cell) => {
            const data = cell.querySelector('Data');
            cellValues.push(data?.textContent?.trim() || '');
          });

          // Skip title rows (first 2 rows usually)
          if (rowIdx < 2) return;

          // Detect header row
          if (cellValues.some(v => v === 'Zeilennr.' || v === 'Nr.' || v === 'Beschreibung')) {
            headerRow = cellValues;
            isHeader = false;
            return;
          }

          // Parse data row
          if (!isHeader && headerRow.length > 0 && cellValues.length >= 5) {
            const getVal = (header: string): string => {
              const idx = headerRow.indexOf(header);
              return idx >= 0 && idx < cellValues.length ? cellValues[idx] : '';
            };

            const supplierCode = getVal('Nr.') || getVal('Artikelnr.');
            const description = getVal('Beschreibung') || getVal('Name') || '';
            const quantityStr = getVal('Menge') || getVal('Menge (Basis)') || '1';
            const unitPriceStr = getVal('VK-Preis Ohne MwSt.') || getVal('VK-Preis (Preisbasis)') || '0';
            const lineTotalStr = getVal('Zeilenbetrag Ohne MwSt.') || '0';
            const unit = getVal('Einheit') || 'KOM';
            const taxRateStr = getVal('MwSt.-Produktbuchungsgruppe') || '10';

            // Skip if no description or it's an empty row
            if (!description || description === '') return;

            const quantity = parseFloat(quantityStr.replace(',', '.')) || 1;
            const unitPrice = parseFloat(unitPriceStr.replace(',', '.')) || 0;
            const lineTotal = parseFloat(lineTotalStr.replace(',', '.')) || (quantity * unitPrice);
            const taxRate = parseFloat(taxRateStr.replace(',', '.')) || 10;
            const taxAmount = lineTotal * (taxRate / 100);

            // Check if expense
            const { isExpense, expenseType } = isExpenseItem(description);
            if (isExpense) {
              if (expenseType === 'transport') {
                detectedExpenses.transport += lineTotal;
              } else if (expenseType === 'customs') {
                detectedExpenses.customs += lineTotal;
              } else {
                detectedExpenses.other += lineTotal;
              }
            }

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
              isExpense,
              expenseType,
            });

            itemIndex++;
          }
        });
      }
    });

    // Calculate totals
    const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    const totalTax = items.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal = subtotal + totalTax;

    return {
      format: 'onk-excel',
      country: 'AT',
      invoiceNumber: invoiceNumber || `IMP-${Date.now()}`,
      invoiceDate,
      currency: 'EUR',
      supplier: {
        name: 'ONK Großhandel', // ONK is the supplier
        taxId: '',
        address: '',
      },
      customer: {
        name: customerName,
        taxId: '',
      },
      items,
      subtotal,
      totalTax,
      grandTotal,
      detectedExpenses,
    };
  };

  // Parse XML file - improved version based on Python
  const parseXMLFile = useCallback(async (xmlContent: string): Promise<ParsedInvoice> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Geçersiz XML dosyası: ' + (parseError.textContent || ''));
    }

    // Detect format
    const { format, country } = detectFormat(doc);

    // If ONK Excel XML format, use dedicated parser
    if (format === 'onk-excel') {
      return parseONKExcelXML(doc);
    }

    // Helper to get text from multiple selectors
    const getText = (selectors: string[], defaultVal: string = ''): string => {
      for (const selector of selectors) {
        try {
          // Try querySelector
          const el = doc.querySelector(selector);
          if (el?.textContent?.trim()) return el.textContent.trim();

          // Try getElementsByTagName for namespace issues
          const tagName = selector.split(/[\s>]/).pop()?.replace(/[^\w]/g, '') || '';
          if (tagName) {
            const elements = doc.getElementsByTagName(tagName);
            if (elements.length > 0 && elements[0].textContent?.trim()) {
              return elements[0].textContent.trim();
            }
            // Try with common prefixes
            for (const prefix of ['cbc:', 'cac:', 'ram:', 'rsm:', 'eslog:', 'eb:']) {
              const prefixedElements = doc.getElementsByTagName(prefix + tagName);
              if (prefixedElements.length > 0 && prefixedElements[0].textContent?.trim()) {
                return prefixedElements[0].textContent.trim();
              }
            }
          }
        } catch {
          continue;
        }
      }
      return defaultVal;
    };

    const getNumber = (selectors: string[], defaultVal: number = 0): number => {
      const text = getText(selectors);
      const num = parseFloat(text.replace(',', '.'));
      return isNaN(num) ? defaultVal : num;
    };

    // Extract invoice header
    const invoiceNumber = getText([
      'InvoiceNumber', 'ID', 'cbc\\:ID', 'InvoiceId',
      'S_BGM C_C106 D_1004', 'D_1004',
      'ExchangedDocument ID'
    ]) || `IMP-${Date.now()}`;

    const invoiceDate = getText([
      'InvoiceDate', 'IssueDate', 'cbc\\:IssueDate',
      'S_DTM C_C507 D_2380', 'D_2380',
      'IssueDateTime DateTimeString'
    ]) || new Date().toISOString().split('T')[0];

    const dueDate = getText([
      'DueDate', 'PaymentDueDate', 'cbc\\:DueDate', 'PaymentDate'
    ]);

    const currency = getText([
      'Currency', 'DocumentCurrencyCode', 'cbc\\:DocumentCurrencyCode',
      'InvoiceCurrencyCode', 'S_CUX C_C504 D_6345', 'D_6345'
    ]) || 'EUR';

    // Extract supplier info
    let supplierName = '';
    let supplierTaxId = '';
    let supplierAddress = '';

    // Try different paths based on format
    if (format === 'eslog') {
      // eSLOG: Find SE (Seller) party in G_SG2
      const sg2Groups = doc.querySelectorAll('G_SG2');
      sg2Groups.forEach(group => {
        const partyType = group.querySelector('D_3035')?.textContent?.trim();
        if (partyType === 'SE') {
          supplierName = group.querySelector('D_3036')?.textContent?.trim() || '';
          supplierAddress = group.querySelector('D_3042')?.textContent?.trim() || '';
          // VAT in G_SG3 with D_1153="VA"
          const vatEl = group.querySelector('D_1154');
          if (vatEl) supplierTaxId = vatEl.textContent?.trim() || '';
        }
      });
    } else {
      // Generic UBL/other formats
      supplierName = getText([
        'AccountingSupplierParty Party PartyName Name',
        'AccountingSupplierParty PartyName Name',
        'SellerTradeParty Name',
        'Biller Name',
        'SellerParty Name'
      ]);

      supplierTaxId = getText([
        'AccountingSupplierParty Party PartyTaxScheme CompanyID',
        'AccountingSupplierParty PartyTaxScheme CompanyID',
        'SellerTradeParty SpecifiedTaxRegistration ID',
        'Biller VATIdentificationNumber'
      ]);
    }

    // Extract items
    const items: ParsedItem[] = [];
    const detectedExpenses = { transport: 0, customs: 0, other: 0 };
    let itemIndex = 0;

    // Try different item container selectors
    const itemSelectors = [
      'G_SG26', // eSLOG
      'InvoiceLine', // UBL
      'ListLineItem', // ebInterface
      'IncludedSupplyChainTradeLineItem', // ZUGFeRD
    ];

    let itemElements: Element[] = [];
    for (const selector of itemSelectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        itemElements = Array.from(elements);
        break;
      }
      // Try with namespace prefix
      const nsElements = doc.getElementsByTagName(selector);
      if (nsElements.length > 0) {
        itemElements = Array.from(nsElements);
        break;
      }
    }

    itemElements.forEach((itemEl) => {
      const getItemText = (selectors: string[]): string => {
        for (const selector of selectors) {
          try {
            const el = itemEl.querySelector(selector);
            if (el?.textContent?.trim()) return el.textContent.trim();
            // Try by tag name
            const tagName = selector.split(/[\s>]/).pop()?.replace(/[^\w]/g, '') || '';
            if (tagName) {
              const elements = itemEl.getElementsByTagName(tagName);
              if (elements.length > 0 && elements[0].textContent?.trim()) {
                return elements[0].textContent.trim();
              }
            }
          } catch {
            continue;
          }
        }
        return '';
      };

      const getItemNumber = (selectors: string[]): number => {
        const text = getItemText(selectors);
        const num = parseFloat(text.replace(',', '.'));
        return isNaN(num) ? 0 : num;
      };

      // Description
      const description = getItemText([
        'D_7008', 'Name', 'Description', 'SpecifiedTradeProduct Name'
      ]) || `Kalem ${itemIndex + 1}`;

      // Supplier code
      const supplierCode = getItemText([
        'D_7140', 'SellersItemIdentification ID', 'ArticleNumber',
        'SellerAssignedID', 'StandardItemIdentification ID'
      ]);

      // Quantity
      const quantity = getItemNumber([
        'D_6060', 'InvoicedQuantity', 'Quantity', 'BilledQuantity'
      ]) || 1;

      // Unit
      let unit = getItemText([
        'D_6411', 'unitCode', 'Unit'
      ]) || 'KOM';
      unit = normalizeUnit(unit);

      // Unit price
      const unitPrice = getItemNumber([
        'D_5118', 'PriceAmount', 'UnitPrice', 'ChargeAmount'
      ]);

      // Tax rate
      const taxRate = getItemNumber([
        'D_5278', 'Percent', 'TaxRate', 'RateApplicablePercent'
      ]) || 22;

      // Line total
      const lineTotal = getItemNumber([
        'D_5004', 'LineExtensionAmount', 'Amount', 'LineTotalAmount'
      ]) || (quantity * unitPrice);

      const taxAmount = lineTotal * (taxRate / 100);

      // Check if expense
      const { isExpense, expenseType } = isExpenseItem(description);
      if (isExpense) {
        if (expenseType === 'transport') {
          detectedExpenses.transport += lineTotal;
        } else if (expenseType === 'customs') {
          detectedExpenses.customs += lineTotal;
        } else {
          detectedExpenses.other += lineTotal;
        }
      }

      items.push({
        id: `item-${itemIndex}`,
        supplierCode,
        description,
        quantity,
        unit,
        unitPrice,
        taxRate,
        taxAmount,
        lineTotal: lineTotal + taxAmount,
        matchStatus: 'unmatched',
        isExpense,
        expenseType,
      });

      itemIndex++;
    });

    // If no items found, create placeholder
    if (items.length === 0) {
      items.push({
        id: 'item-0',
        description: 'Manuel giriş gerekli',
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
      'TaxExclusiveAmount', 'TotalGrossAmount', 'LineExtensionAmount',
      'D_5004[D_5025="79"]', 'LineTotalAmount'
    ]) || items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

    const totalTax = getNumber([
      'TaxAmount', 'TaxTotalAmount', 'D_5004[D_5025="176"]'
    ]) || items.reduce((sum, i) => sum + i.taxAmount, 0);

    const grandTotal = getNumber([
      'PayableAmount', 'TaxInclusiveAmount', 'GrandTotalAmount',
      'D_5004[D_5025="9"]', 'Total'
    ]) || (subtotal + totalTax);

    return {
      format,
      country,
      invoiceNumber,
      invoiceDate: formatDateString(invoiceDate),
      dueDate: dueDate ? formatDateString(dueDate) : undefined,
      currency,
      supplier: {
        name: supplierName,
        taxId: supplierTaxId,
        address: supplierAddress,
      },
      items,
      subtotal,
      totalTax,
      grandTotal,
      detectedExpenses,
    };
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.xml')) {
      toast.error('Lütfen bir XML dosyası seçin');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const content = await selectedFile.text();
      const parsed = await parseXMLFile(content);

      // Auto-match supplier by tax ID
      if (parsed.supplier.taxId) {
        const cleanTaxId = parsed.supplier.taxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const matchedSupplier = suppliers.find(s => {
          const supplierTaxClean = (s.taxId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          return supplierTaxClean === cleanTaxId ||
            supplierTaxClean.replace(/^[A-Z]{2}/, '') === cleanTaxId.replace(/^[A-Z]{2}/, '');
        });
        if (matchedSupplier) {
          setSupplierId(matchedSupplier.id);
        }
      }

      // Auto-match products
      const matchedItems = parsed.items.map(item => matchProduct(item, products, supplierId));
      parsed.items = matchedItems;

      // Auto-fill detected expenses
      if (parsed.detectedExpenses.transport > 0) {
        setTransportCost(parsed.detectedExpenses.transport);
      }
      if (parsed.detectedExpenses.customs > 0) {
        setCustomsCost(parsed.detectedExpenses.customs);
      }

      setParsedInvoice(parsed);
      setStep('review');
      toast.success(`XML başarıyla okundu: ${parsed.items.length} kalem`);
    } catch (error) {
      console.error('XML parse error:', error);
      toast.error('XML dosyası okunamadı: ' + (error as Error).message);
    } finally {
      setParsing(false);
    }
  };

  // Match product helper
  const matchProduct = (item: ParsedItem, productList: Product[], currentSupplierId: string): ParsedItem => {
    // Skip expenses
    if (item.isExpense) return item;

    // Try to match by supplier code
    if (item.supplierCode && currentSupplierId) {
      const matchByCode = productList.find(p =>
        p.supplierMappings?.[currentSupplierId]?.code?.toLowerCase() === item.supplierCode?.toLowerCase()
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

    // Try to match by our product code
    if (item.supplierCode) {
      const matchByOurCode = productList.find(p =>
        p.code?.toLowerCase() === item.supplierCode?.toLowerCase()
      );
      if (matchByOurCode) {
        return {
          ...item,
          matchedProductId: matchByOurCode.id,
          matchedProductName: matchByOurCode.name,
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

    const actualProductId = productId === 'none' ? '' : productId;
    const product = products.find(p => p.id === actualProductId);
    const updatedItems = parsedInvoice.items.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        matchedProductId: actualProductId || undefined,
        matchedProductName: product?.name || '',
        matchStatus: actualProductId ? 'matched' as const : 'unmatched' as const,
      };
    });

    setParsedInvoice({ ...parsedInvoice, items: updatedItems });
  };

  // Calculate totals with expenses
  const totalWithExpenses = (parsedInvoice?.grandTotal || 0) + transportCost + customsCost;

  // Stats (exclude expense items)
  const productItems = parsedInvoice?.items.filter(i => !i.isExpense) || [];
  const matchedCount = productItems.filter(i => i.matchStatus === 'matched').length;
  const suggestedCount = productItems.filter(i => i.matchStatus === 'suggested').length;
  const unmatchedCount = productItems.filter(i => i.matchStatus === 'unmatched').length;
  const matchPercentage = productItems.length > 0 ? Math.round((matchedCount / productItems.length) * 100) : 0;

  // Save invoice
  const handleSave = async () => {
    if (!parsedInvoice || !branchId) {
      toast.error('Lütfen şube seçin');
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
        supplierVAT: parsedInvoice.supplier.taxId || null,
        currency: parsedInvoice.currency,
        items: parsedInvoice.items.filter(i => !i.isExpense).map(item => ({
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
        expenses: {
          transport: {
            amount: transportCost,
            description: 'Nakliye masrafı',
          },
          customs: {
            amount: customsCost,
            description: 'Gümrük masrafı',
          },
          total: transportCost + customsCost,
        },
        transport_cost: transportCost,
        customs_cost: customsCost,
        total_expense: transportCost + customsCost,
        grand_total: totalWithExpenses,
        total: totalWithExpenses,
        status: 'pending',
        paymentStatus: 'unpaid',
        importSource: `XML - ${SUPPORTED_FORMATS[parsedInvoice.format]?.name || parsedInvoice.format}`,
        importCountry: parsedInvoice.country,
        matchingStats: {
          totalItems: productItems.length,
          matchedItems: matchedCount,
          matchPercentage,
        },
        notes: `XML import: ${file?.name}`,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      await addFirestoreData('purchases', invoiceData);
      toast.success('Fatura başarıyla eklendi');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Kaydetme hatası: ' + (error as Error).message);
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
            XML E-Fatura İçe Aktar
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
              <p className="text-lg font-medium mb-2">XML Dosyası Seçin</p>
              <p className="text-sm text-muted-foreground mb-4">
                e-Fatura XML dosyasını yükleyin
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
                      {SUPPORTED_FORMATS[parsedInvoice.format]?.name || parsedInvoice.format}
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
                    <span className="text-muted-foreground">Tedarikçi:</span>
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
                      <span className="text-sm">Ürün Eşleştirme</span>
                      <span className="text-sm font-medium">{matchPercentage}%</span>
                    </div>
                    <Progress value={matchPercentage} className="h-2" />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{matchedCount} Eşleşti</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>{suggestedCount} Öneri</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{unmatchedCount} Eşleşmedi</span>
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
                        <TableHead>Tedarikçi Kodu</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead className="text-right">Miktar</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead className="text-right">Fiyat</TableHead>
                        <TableHead className="text-right">KDV %</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                        <TableHead>Eşleşen Ürün</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedInvoice.items.map((item) => (
                        <TableRow key={item.id} className={
                          item.isExpense ? 'bg-orange-50' :
                          item.matchStatus === 'matched' ? 'bg-green-50' :
                          item.matchStatus === 'suggested' ? 'bg-yellow-50' : 'bg-red-50'
                        }>
                          <TableCell>
                            {item.isExpense && <Truck className="h-4 w-4 text-orange-500" />}
                            {!item.isExpense && item.matchStatus === 'matched' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {!item.isExpense && item.matchStatus === 'suggested' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {!item.isExpense && item.matchStatus === 'unmatched' && <XCircle className="h-4 w-4 text-red-500" />}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.supplierCode || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right font-mono">{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.taxRate}%</TableCell>
                          <TableCell className="text-right font-mono font-medium">{item.lineTotal.toFixed(2)}</TableCell>
                          <TableCell>
                            {item.isExpense ? (
                              <span className="text-xs text-orange-600 font-medium">
                                {item.expenseType === 'transport' ? '🚚 Nakliye' :
                                 item.expenseType === 'customs' ? '🛃 Gümrük' : '📦 Masraf'}
                              </span>
                            ) : (
                              <Select
                                value={item.matchedProductId || 'none'}
                                onValueChange={(value) => updateItemMatch(item.id, value === 'none' ? '' : value)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Ürün seç..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Seçim yok --</SelectItem>
                                  {products.filter(p => p.id).map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
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
                  <Label>Şube *</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <Store className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Şube seçin" />
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

                <div className="space-y-2">
                  <Label>Tedarikçi</Label>
                  <Select value={supplierId || 'none'} onValueChange={(v) => setSupplierId(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tedarikçi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Seçim yok --</SelectItem>
                      {suppliers.filter(s => s.id).map((s) => (
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
                    Nakliye Masrafı (EUR)
                  </Label>
                  <Input
                    type="number"
                    value={transportCost}
                    onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                  {parsedInvoice.detectedExpenses.transport > 0 && (
                    <p className="text-xs text-orange-600">
                      XML'den tespit edildi: {parsedInvoice.detectedExpenses.transport.toFixed(2)} EUR
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Gümrük Masrafı (EUR)
                  </Label>
                  <Input
                    type="number"
                    value={customsCost}
                    onChange={(e) => setCustomsCost(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                  {parsedInvoice.detectedExpenses.customs > 0 && (
                    <p className="text-xs text-orange-600">
                      XML'den tespit edildi: {parsedInvoice.detectedExpenses.customs.toFixed(2)} EUR
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fatura Özeti</CardTitle>
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
                      <span className="text-muted-foreground">Kalem Sayısı:</span>
                      <span>{productItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eşleşen:</span>
                      <span className="text-green-600">{matchedCount} / {productItems.length}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fatura Toplamı:</span>
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
                        <span className="text-muted-foreground">Gümrük:</span>
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
                    Fatura Oluştur
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
    'PCS': 'KOM',
    'ST': 'KOM',
    'KGM': 'KG',
    'GRM': 'GR',
    'LTR': 'LT',
    'MTR': 'M',
    'MTK': 'M2',
    'H87': 'KOM',
  };
  return unitMap[unit.toUpperCase()] || unit;
}

function formatDateString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Common date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
    /^(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (let i = 0; i < formats.length; i++) {
    const match = dateStr.match(formats[i]);
    if (match) {
      if (i === 0) {
        return dateStr.substring(0, 10);
      } else if (i === 1) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  return dateStr;
}
