'use client';

import { useState, useEffect } from 'react';
import { Calculator, Plus, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateVATNumber } from '@/lib/vies';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { addFirestoreData, updateFirestoreData, subscribeToData, pushData } from '@/services/firebase';

// DDV Oranları (Slovenya)
const DDV_RATES = [
  { label: '22% - Standart', value: 22 },
  { label: '9.5% - Indirimli', value: 9.5 },
  { label: '5% - Kitap/E-kitap', value: 5 },
  { label: '0% - Muaf', value: 0 },
];

// Kategoriler
const CATEGORIES = [
  { value: 'electricity', label: 'Elektrik' },
  { value: 'water', label: 'Su' },
  { value: 'gas', label: 'Dogalgaz' },
  { value: 'rent', label: 'Kira' },
  { value: 'internet', label: 'Internet/Telefon' },
  { value: 'personnel', label: 'Personel' },
  { value: 'fuel', label: 'Yakit' },
  { value: 'maintenance', label: 'Bakim-Onarim' },
  { value: 'transport', label: 'Nakliye' },
  { value: 'insurance', label: 'Sigorta' },
  { value: 'consulting', label: 'Danismanlik' },
  { value: 'advertising', label: 'Reklam' },
  { value: 'stationery', label: 'Kirtasiye' },
  { value: 'cleaning', label: 'Temizlik' },
  { value: 'food', label: 'Yemek' },
  { value: 'travel', label: 'Seyahat' },
  { value: 'bank_fees', label: 'Banka Masraflari' },
  { value: 'other', label: 'Diger' },
];

// Odeme Durumlari
const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Odendi' },
  { value: 'pending', label: 'Bekliyor' },
  { value: 'due', label: 'Vadeli' },
];

// Odeme Yontemleri
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Nakit' },
  { value: 'bank', label: 'Banka Havalesi' },
  { value: 'credit', label: 'Kredi Karti' },
  { value: 'check', label: 'Cek' },
];

// EU Ulke listesi - VIES icin
const EU_COUNTRIES = [
  { code: 'SI', name: 'Slovenya' },
  { code: 'AT', name: 'Avusturya' },
  { code: 'DE', name: 'Almanya' },
  { code: 'IT', name: 'Italya' },
  { code: 'HR', name: 'Hirvatistan' },
  { code: 'HU', name: 'Macaristan' },
  { code: 'CZ', name: 'Cekya' },
  { code: 'SK', name: 'Slovakya' },
  { code: 'PL', name: 'Polonya' },
  { code: 'FR', name: 'Fransa' },
  { code: 'NL', name: 'Hollanda' },
  { code: 'BE', name: 'Belcika' },
  { code: 'ES', name: 'Ispanya' },
  { code: 'PT', name: 'Portekiz' },
  { code: 'GR', name: 'Yunanistan' },
];

// Şubeler
const BRANCHES = [
  { id: 'genel', name: 'Genel Giderler', icon: '🏢', description: 'Vergi, sicil, muhasebe vb.' },
  { id: 'merkez', name: 'Merkez Depo', icon: '🏭', description: 'Depo masrafları' },
  { id: 'balkan', name: 'Balkan Market', icon: '🛒', description: 'Şube masrafları' },
  { id: 'desetka', name: 'Desetka Market', icon: '🛒', description: 'Şube masrafları' },
  { id: 'mesnica', name: 'Mesnica Kasap', icon: '🥩', description: 'Kasap masrafları' },
];

interface ExpenseVendor {
  id: string;
  name: string;
  category?: string;
  taxNumber?: string;
}

interface Employee {
  id: string;
  name: string;
  surname?: string;
  fullName?: string;
}

interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: any;
  onSave?: () => void;
}

export function ExpenseDialog({ open, onOpenChange, expense, onSave }: ExpenseDialogProps) {
  const isEditMode = !!expense;

  // Form state
  const [branchId, setBranchId] = useState('genel');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [ddvRate, setDdvRate] = useState('22');
  const [ddvAmount, setDdvAmount] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [saving, setSaving] = useState(false);

  // Data from Firebase
  const [vendors, setVendors] = useState<ExpenseVendor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Vendor add
  const [newVendorName, setNewVendorName] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);

  // VIES Validation state for new vendor
  const [vatCountryCode, setVatCountryCode] = useState('SI');
  const [vatNumber, setVatNumber] = useState('');
  const [validatingVat, setValidatingVat] = useState(false);
  const [vatResult, setVatResult] = useState<{
    valid: boolean;
    companyName?: string;
    companyAddress?: string;
    error?: string;
  } | null>(null);

  // Load vendors from RTDB (same as Python desktop app: erp/expense_vendors)
  useEffect(() => {
    console.log('ExpenseDialog: Loading expense vendors from RTDB...');
    const unsubscribe = subscribeToData('expense_vendors', (data) => {
      console.log('ExpenseDialog: Expense vendors data received:', data ? Object.keys(data).length : 0);
      if (data) {
        const vendorList = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          name: v.name || '',
          category: v.category,
          taxNumber: v.taxNumber || v.ddvNumber,
        })).filter((v: ExpenseVendor) => v.name);
        vendorList.sort((a: ExpenseVendor, b: ExpenseVendor) => a.name.localeCompare(b.name));
        setVendors(vendorList);
        console.log('ExpenseDialog: Expense vendors loaded:', vendorList.length, vendorList.map(v => v.name));
      } else {
        console.log('ExpenseDialog: No expense vendors data in RTDB');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load employees from RTDB (same as Python desktop app: erp/employees)
  useEffect(() => {
    if (!open) return; // Only load when dialog opens

    console.log('ExpenseDialog: Loading employees from RTDB...');
    const unsubscribe = subscribeToData('employees', (data) => {
      console.log('ExpenseDialog: Employees data received:', data ? Object.keys(data).length : 0);
      if (data) {
        const list = Object.entries(data).map(([id, e]: [string, any]) => {
          // Python structure: personal_info.full_name
          const personalInfo = e.personal_info || {};
          const fullName = personalInfo.full_name || '';
          const firstName = personalInfo.first_name || e.firstName || e.name || '';
          const lastName = personalInfo.last_name || e.lastName || e.surname || '';
          return {
            id,
            name: firstName,
            surname: lastName,
            fullName: fullName || `${firstName} ${lastName}`.trim(),
          };
        }).filter((e: Employee) => e.name || e.fullName);
        list.sort((a: Employee, b: Employee) => (a.fullName || a.name).localeCompare(b.fullName || b.name));
        setEmployees(list);
        console.log('ExpenseDialog: Employees loaded:', list.length, list.map(e => e.fullName));
      } else {
        console.log('ExpenseDialog: No employees data in RTDB');
      }
    });
    return () => unsubscribe();
  }, [open]);

  // Load vehicles from RTDB (same as Python desktop app: erp/vehicles)
  useEffect(() => {
    if (!open) return; // Only load when dialog opens

    console.log('ExpenseDialog: Loading vehicles from RTDB...');
    const unsubscribe = subscribeToData('vehicles', (data) => {
      console.log('ExpenseDialog: Vehicles data received:', data ? Object.keys(data).length : 0);
      if (data) {
        const list = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          plate: v.plate || '',
          brand: v.brand || '',
          model: v.model || '',
        })).filter((v: Vehicle) => v.plate);
        list.sort((a: Vehicle, b: Vehicle) => a.plate.localeCompare(b.plate));
        setVehicles(list);
        console.log('ExpenseDialog: Vehicles loaded:', list.length, list.map(v => v.plate));
      } else {
        console.log('ExpenseDialog: No vehicles data in RTDB');
      }
    });
    return () => unsubscribe();
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (expense) {
        // Edit mode - load expense data
        setBranchId(expense.branchId || 'genel');
        setInvoiceNo(expense.invoiceNo || expense.documentNo || '');
        setInvoiceDate(expense.invoiceDate || expense.documentDate || '');
        setServiceDate(expense.serviceDate || expense.invoiceDate || '');
        setCategory(expense.category || 'other');
        setDescription(expense.description || '');
        setVendorId(expense.vendorId || expense.supplierId || '');
        setGrossAmount(String(expense.grossAmount || expense.totalAmount || expense.amount || ''));
        setDdvRate(String(expense.ddvRate || 22));
        setDdvAmount(String(expense.ddvAmount || expense.vatAmount || ''));
        setNetAmount(String(expense.netAmount || ''));
        setPaymentStatus(expense.paymentStatus || 'paid');
        setPaymentMethod(expense.paymentMethod || 'cash');
        setDueDate(expense.dueDate || '');
        setNotes(expense.notes || '');
        setEmployeeId(expense.employeeId || '');
        setVehicleId(expense.vehicleId || '');
      } else {
        // New expense - reset form
        const today = new Date().toISOString().split('T')[0];
        setBranchId('genel');
        setInvoiceNo('');
        setInvoiceDate(today);
        setServiceDate(today);
        setCategory('other');
        setDescription('');
        setVendorId('');
        setGrossAmount('');
        setDdvRate('22');
        setDdvAmount('');
        setNetAmount('');
        setPaymentStatus('paid');
        setPaymentMethod('cash');
        setDueDate('');
        setNotes('');
        setEmployeeId('');
        setVehicleId('');
      }
    }
  }, [open, expense]);

  // VIES VAT Validation for new vendor
  const handleValidateVat = async () => {
    if (!vatNumber.trim() || vatNumber.length < 6) {
      alert('Gecerli bir VAT numarasi giriniz');
      return;
    }

    setValidatingVat(true);
    setVatResult(null);

    try {
      const fullVatNumber = vatCountryCode + vatNumber.trim().toUpperCase();
      const result = await validateVATNumber(fullVatNumber);

      setVatResult({
        valid: result.valid,
        companyName: result.companyName,
        companyAddress: result.companyAddress,
        error: result.error,
      });

      if (result.valid && result.companyName) {
        // Otomatik isim doldur
        setNewVendorName(result.companyName);
      }
    } catch (error) {
      setVatResult({
        valid: false,
        error: (error as Error).message || 'Dogrulama hatasi',
      });
    } finally {
      setValidatingVat(false);
    }
  };

  // Add new vendor
  const handleAddVendor = async () => {
    if (!newVendorName.trim()) return;

    setAddingVendor(true);
    try {
      const fullVatNumber = vatNumber.trim() ? vatCountryCode + vatNumber.trim().toUpperCase() : '';
      const vendorData = {
        name: newVendorName.trim(),
        category: category || 'other',
        ddvNumber: fullVatNumber,
        taxId: fullVatNumber,
        address: vatResult?.companyAddress?.replace(/\n/g, ', ') || '',
        isActive: true,
        // VIES doğrulama bilgileri
        viesValidated: vatResult?.valid || false,
        viesValidatedAt: vatResult?.valid ? new Date().toISOString() : null,
        viesCompanyName: vatResult?.companyName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newId = await pushData('expense_vendors', vendorData);
      if (newId) {
        setVendorId(newId);
        setNewVendorName('');
        setVatNumber('');
        setVatResult(null);
      }
    } catch (error) {
      console.error('Add vendor error:', error);
      alert('Cari eklenemedi: ' + (error as Error).message);
    } finally {
      setAddingVendor(false);
    }
  };

  // Calculate DDV from gross (extract DDV)
  const calculateFromGross = () => {
    const gross = parseFloat(grossAmount) || 0;
    const rate = parseFloat(ddvRate) || 0;
    if (gross > 0) {
      const net = gross / (1 + rate / 100);
      const ddv = gross - net;
      setNetAmount(net.toFixed(2));
      setDdvAmount(ddv.toFixed(2));
    }
  };

  // Calculate gross from net (add DDV)
  const calculateFromNet = () => {
    const net = parseFloat(netAmount) || 0;
    const rate = parseFloat(ddvRate) || 0;
    if (net > 0) {
      const ddv = net * (rate / 100);
      const gross = net + ddv;
      setGrossAmount(gross.toFixed(2));
      setDdvAmount(ddv.toFixed(2));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!invoiceNo.trim()) {
      alert('Lutfen fatura numarasi girin!');
      return;
    }
    if (!description.trim()) {
      alert('Lutfen aciklama girin!');
      return;
    }
    if (!netAmount || parseFloat(netAmount) <= 0) {
      alert('Lutfen gecerli bir tutar girin!');
      return;
    }

    setSaving(true);
    console.log('ExpenseDialog: Starting save...');

    try {
      const vendor = vendors.find(v => v.id === vendorId);
      const employee = employees.find(e => e.id === employeeId);
      const vehicle = vehicles.find(v => v.id === vehicleId);
      const branch = BRANCHES.find(b => b.id === branchId);

      const expenseData = {
        // Branch info
        branchId,
        branchName: branch?.name || 'Genel Giderler',

        // Invoice info
        invoiceNo: invoiceNo.trim(),
        documentNo: invoiceNo.trim(),
        invoiceDate,
        documentDate: invoiceDate,
        serviceDate: serviceDate || invoiceDate,

        // Category & description
        category,
        description: description.trim(),

        // Vendor info
        vendorId: vendorId && vendorId !== 'none' ? vendorId : null,
        vendorName: vendor?.name || '',
        vendor: vendor?.name || '',
        supplierId: vendorId && vendorId !== 'none' ? vendorId : null,
        supplierName: vendor?.name || '',

        // Employee info
        employeeId: employeeId && employeeId !== 'none' ? employeeId : null,
        employeeName: employee?.fullName || employee?.name || '',

        // Vehicle info
        vehicleId: vehicleId && vehicleId !== 'none' ? vehicleId : null,
        vehiclePlate: vehicle?.plate || '',

        // Amounts
        netAmount: parseFloat(netAmount) || 0,
        amount: parseFloat(netAmount) || 0,
        ddvRate: parseFloat(ddvRate) || 22,
        ddvAmount: parseFloat(ddvAmount) || 0,
        vatAmount: parseFloat(ddvAmount) || 0,
        grossAmount: parseFloat(grossAmount) || 0,
        totalAmount: parseFloat(grossAmount) || 0,

        // Payment
        paymentStatus,
        paymentMethod: paymentStatus === 'paid' ? paymentMethod : null,
        paidAmount: paymentStatus === 'paid' ? parseFloat(grossAmount) || 0 : 0,
        remainingAmount: paymentStatus === 'paid' ? 0 : parseFloat(grossAmount) || 0,
        status: paymentStatus === 'paid' ? 'paid' : 'pending',

        // Due date
        dueDate: paymentStatus === 'due' ? dueDate : null,

        // Meta
        notes: notes.trim(),
        currency: 'EUR',
        source_type: 'manual',
        updatedAt: new Date().toISOString(),
      };

      console.log('ExpenseDialog: Expense data prepared:', expenseData);

      if (isEditMode && expense?.id) {
        // Update existing in Firestore
        console.log('ExpenseDialog: Updating expense:', expense.id);
        await updateFirestoreData('expenses', expense.id, expenseData);
        console.log('ExpenseDialog: Update successful');
      } else {
        // Create new in Firestore
        const newExpenseData = {
          ...expenseData,
          date: invoiceDate,
          isActive: true,
        };
        console.log('ExpenseDialog: Creating new expense in erp_expenses...');
        const newId = await addFirestoreData('expenses', newExpenseData);
        console.log('ExpenseDialog: Created successfully with ID:', newId);
      }

      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('ExpenseDialog: Save error:', error);
      alert('Kaydetme hatasi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? 'Masraf Fisi Duzenle' : 'Yeni Masraf Fisi'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Şube Seçimi */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Şube *</Label>
            <div className="grid grid-cols-5 gap-2">
              {BRANCHES.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setBranchId(branch.id)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    branchId === branch.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="text-xl mb-1">{branch.icon}</div>
                  <div className="text-xs font-medium truncate">{branch.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fatura Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Fatura Bilgileri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNo">Fatura No *</Label>
                <Input
                  id="invoiceNo"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Orn: 2024-12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Fatura Tarihi *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceDate">Hizmet Tarihi</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Aciklama *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Masraf aciklamasi..."
              />
            </div>
          </div>

          {/* Tedarikci Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Tedarikci Bilgileri
            </h3>
            <div className="space-y-3">
              {/* Mevcut carilerden sec */}
              <div className="space-y-2">
                <Label>Masraf Carisi</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="- Cari Secin -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Cari Secin -</SelectItem>
                    {vendors.filter(v => v.id).map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Yeni cari ekle - VIES ile */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <p className="text-xs font-medium text-amber-800">Yeni cari ekle (VIES ile dogrula)</p>
                </div>

                {/* VIES Dogrulama */}
                <div className="flex gap-2">
                  <Select
                    value={vatCountryCode}
                    onValueChange={(v) => {
                      setVatCountryCode(v);
                      setVatResult(null);
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EU_COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="VAT numarasi"
                    value={vatNumber}
                    onChange={(e) => {
                      setVatNumber(e.target.value.replace(/\s/g, '').toUpperCase());
                      setVatResult(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (vatNumber.trim() && !validatingVat) {
                          handleValidateVat();
                        }
                      }
                    }}
                    className="flex-1 h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleValidateVat}
                    disabled={validatingVat || !vatNumber.trim()}
                    className="h-8"
                  >
                    {validatingVat ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* VIES Sonucu */}
                {vatResult && (
                  <div className={`p-2 rounded text-xs ${
                    vatResult.valid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <div className="flex items-center gap-1">
                      {vatResult.valid ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span className="font-medium">
                        {vatResult.valid ? 'Gecerli' : 'Gecersiz'}
                      </span>
                    </div>
                    {vatResult.companyName && (
                      <div className="mt-1">{vatResult.companyName}</div>
                    )}
                  </div>
                )}

                {/* Cari Adi ve Ekle */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Cari adi"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddVendor();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddVendor}
                    disabled={!newVendorName.trim() || addingVendor}
                    className="h-8"
                  >
                    {addingVendor ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    Ekle
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Calisan ve Arac */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Calisan ve Arac
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Calisan</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="- Calisan Secin -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Calisan Secin -</SelectItem>
                    {employees.filter(e => e.id).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName || emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle">Arac</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="- Arac Secin -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Arac Secin -</SelectItem>
                    {vehicles.filter(v => v.id).map((veh) => (
                      <SelectItem key={veh.id} value={veh.id}>
                        {veh.plate} {veh.brand && veh.model ? `(${veh.brand} ${veh.model})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tutar ve DDV */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Tutar ve DDV
            </h3>

            {/* Brut giris */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="grossAmount" className="text-red-700">
                    Toplam (Brut)
                  </Label>
                  <Input
                    id="grossAmount"
                    type="number"
                    step="0.01"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-lg font-semibold"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateFromGross}
                  className="mt-6 bg-red-600 text-white hover:bg-red-700"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  DDV Cikar
                </Button>
              </div>
            </div>

            {/* DDV Orani */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ddvRate">DDV Orani</Label>
                <Select value={ddvRate} onValueChange={setDdvRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="DDV Oranı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {DDV_RATES.map((rate) => (
                      <SelectItem key={rate.value} value={String(rate.value)}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ddvAmount">DDV Tutari</Label>
                <Input
                  id="ddvAmount"
                  type="number"
                  step="0.01"
                  value={ddvAmount}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Net giris */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="netAmount" className="text-emerald-700">
                    Net (DDV Haric)
                  </Label>
                  <Input
                    id="netAmount"
                    type="number"
                    step="0.01"
                    value={netAmount}
                    onChange={(e) => setNetAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-lg font-semibold"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateFromNet}
                  className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  DDV Ekle
                </Button>
              </div>
            </div>
          </div>

          {/* Odeme Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Odeme Bilgileri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Odeme Durumu *</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ödeme durumu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paymentStatus === 'paid' && (
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Odeme Yontemi *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ödeme yöntemi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {paymentStatus === 'due' && (
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Vade Tarihi</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notlar */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek notlar, detaylar, referanslar..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Iptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
