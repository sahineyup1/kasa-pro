'use client';

import { useState, useEffect } from 'react';
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
import { pushData, updateData } from '@/services/firebase';
import { Loader2 } from 'lucide-react';

// Roles
const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'kasap', label: 'Kasap' },
  { value: 'kasiyer', label: 'Kasiyer' },
  { value: 'depo', label: 'Depo' },
  { value: 'depo_muduru', label: 'Depo Muduru' },
  { value: 'sofor', label: 'Sofor' },
  { value: 'finans', label: 'Finans' },
];

// Employment status
const STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Pasif' },
  { value: 'on_leave', label: 'Izinli' },
  { value: 'terminated', label: 'Isten Ayrildi' },
];

// Branches (will be loaded from Firebase in production)
const BRANCHES = [
  'Merkez Depo',
  'Atlas Mesnica',
  'Desetka Market',
  'Balkan Market',
];

interface Employee {
  id: string;
  personal?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    dateOfBirth?: string;
    nationality?: string;
  };
  employment?: {
    role?: string;
    branch?: string;
    branchId?: string;
    salary?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  documents?: {
    visaExpiry?: string;
    workPermitExpiry?: string;
    documentExpiry?: string;
    nationalId?: string;
    taxNumber?: string;
  };
  notes?: string;
  // Flat structure support
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSave?: () => void;
}

// Helper to get field from nested or flat structure
function getField<T>(employee: Employee | null, nestedPath: string[], flatKey: string, defaultVal: T): T {
  if (!employee) return defaultVal;

  let value: any = employee;
  for (const key of nestedPath) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = undefined;
      break;
    }
  }
  if (value !== undefined && value !== null) return value as T;

  const flatValue = (employee as any)[flatKey];
  if (flatValue !== undefined && flatValue !== null) return flatValue as T;

  return defaultVal;
}

export function EmployeeDialog({ open, onOpenChange, employee, onSave }: EmployeeDialogProps) {
  const isEditMode = !!employee;

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');

  // Employment info
  const [role, setRole] = useState('kasiyer');
  const [branch, setBranch] = useState('');
  const [bankSalary, setBankSalary] = useState('');
  const [cashSalary, setCashSalary] = useState('');
  const [status, setStatus] = useState('active');
  const [startDate, setStartDate] = useState('');

  // Documents
  const [visaExpiry, setVisaExpiry] = useState('');
  const [workPermitExpiry, setWorkPermitExpiry] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Saving state
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];

      if (employee) {
        // Edit mode - load existing data (support both Python RTDB and web structures)
        const emp = employee as any;

        // Personal info - Python uses personal_info, web uses personal
        const personalInfo = emp.personal_info || emp.personal || {};
        const fullName = personalInfo.full_name || '';
        const nameParts = fullName.split(' ');
        setFirstName(personalInfo.first_name || personalInfo.firstName || nameParts[0] || emp.firstName || '');
        setLastName(personalInfo.last_name || personalInfo.lastName || nameParts.slice(1).join(' ') || emp.lastName || '');
        setPhone(personalInfo.phone || emp.phone || '');
        setEmail(personalInfo.email || emp.email || '');
        setAddress(personalInfo.address || emp.address || '');
        setDateOfBirth(personalInfo.birth_date || personalInfo.dateOfBirth || emp.dateOfBirth || '');
        setNationality(personalInfo.nationality || emp.nationality || '');

        // Employment info - Python uses employment_info, web uses employment
        const employmentInfo = emp.employment_info || emp.employment || {};
        setRole(employmentInfo.role || emp.role || 'kasiyer');
        setBranch(employmentInfo.branch || emp.branch || '');
        const salaryInfo = emp.salary_info || {};
        setBankSalary(String(salaryInfo.monthly_salary || employmentInfo.salary || emp.salary || '') || '');
        setCashSalary(String(salaryInfo.cash_salary || emp.cashSalary || '') || '');
        setStatus(emp.status || employmentInfo.status || 'active');
        setStartDate(employmentInfo.start_date || employmentInfo.startDate || emp.startDate || '');

        // Documents - Python uses visa_info, web uses documents
        const visaInfo = emp.visa_info || emp.documents || {};
        const visaDate = visaInfo.visa_expiry_date || visaInfo.visaExpiry || emp.visaExpiry || '';
        setVisaExpiry(visaDate === '9999-12-31' ? '' : visaDate);
        setWorkPermitExpiry(visaInfo.work_permit_expiry || visaInfo.workPermitExpiry || emp.workPermitExpiry || '');
        setNationalId(String(personalInfo.tc_no || visaInfo.nationalId || emp.nationalId || ''));
        setTaxNumber(String(visaInfo.taxNumber || emp.taxNumber || ''));

        // Notes
        const notesVal = emp.notes;
        setNotes(typeof notesVal === 'string' ? notesVal : '');
      } else {
        // New employee - reset form
        setFirstName('');
        setLastName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setDateOfBirth('');
        setNationality('');
        setRole('kasiyer');
        setBranch('');
        setBankSalary('');
        setCashSalary('');
        setStatus('active');
        setStartDate(today);
        setVisaExpiry('');
        setWorkPermitExpiry('');
        setNationalId('');
        setTaxNumber('');
        setNotes('');
      }
    }
  }, [open, employee]);

  const handleSave = async () => {
    // Validation
    if (!firstName.trim()) {
      alert('Lutfen isim girin!');
      return;
    }

    if (!lastName.trim()) {
      alert('Lutfen soyisim girin!');
      return;
    }

    if (!branch) {
      alert('Lutfen sube secin!');
      return;
    }

    setSaving(true);
    try {
      // Save in Python RTDB structure for compatibility
      const employeeData = {
        // Python structure: personal_info
        personal_info: {
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          birth_date: dateOfBirth,
          nationality: nationality.trim(),
        },
        // Python structure: employment_info
        employment_info: {
          role,
          branch,
          position: role, // Same as role for now
          start_date: startDate,
          status,
        },
        // Python structure: salary_info
        salary_info: {
          monthly_salary: parseFloat(bankSalary) || 0,
          cash_salary: parseFloat(cashSalary) || 0,
          sgk_included: true,
        },
        // Python structure: visa_info
        visa_info: {
          visa_expiry_date: visaExpiry || '9999-12-31',
          work_permit_expiry: workPermitExpiry || null,
          residence_type: visaExpiry ? 'Yıllık Vize' : 'Sürekli Vatandaş',
        },
        // Top level status
        status,
        notes: (notes || '').toString().trim(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && employee?.id) {
        // Update in RTDB (erp/employees/{id})
        await updateData(`employees/${employee.id}`, employeeData);
      } else {
        // Add new employee to RTDB (erp/employees)
        await pushData('employees', {
          ...employeeData,
          createdAt: new Date().toISOString(),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? 'Personel Duzenle' : 'Yeni Personel'}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode
              ? 'Personel bilgilerini guncelleyin'
              : 'Yeni personel eklemek icin formu doldurun'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="personal">Kisisel</TabsTrigger>
              <TabsTrigger value="employment">Istihdam</TabsTrigger>
              <TabsTrigger value="documents">Belgeler</TabsTrigger>
              <TabsTrigger value="notes">Notlar</TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Isim *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Orn: Ahmet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Soyisim *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Orn: Yilmaz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Orn: +386 40 123 456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Orn: ahmet@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Dogum Tarihi</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Uyruk</Label>
                  <Input
                    id="nationality"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="Orn: Turkiye"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ikamet adresi..."
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Employment Tab */}
            <TabsContent value="employment" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Rol secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Sube *</Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sube secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Salary Section */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  Maas Bilgileri
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankSalary" className="flex items-center gap-2">
                      <span className="text-amber-600">Resmi Maas (Banka)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                      <Input
                        id="bankSalary"
                        type="number"
                        step="0.01"
                        value={bankSalary}
                        onChange={(e) => setBankSalary(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-gray-500">SGK/vergi dahil resmi bordro maasi</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashSalary" className="flex items-center gap-2">
                      <span className="text-green-600">Elden Maas (Nakit)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                      <Input
                        id="cashSalary"
                        type="number"
                        step="0.01"
                        value={cashSalary}
                        onChange={(e) => setCashSalary(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Kayit disi elden odenen tutar</p>
                  </div>
                </div>
                {(parseFloat(bankSalary) > 0 || parseFloat(cashSalary) > 0) && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600">Toplam Maas:</span>
                    <span className="font-semibold text-lg">
                      €{((parseFloat(bankSalary) || 0) + (parseFloat(cashSalary) || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {parseFloat(cashSalary) > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-700">
                    Elden maas tanimli. Bu personelin elden odemesi "Toplu Maas Ode" ile yapilmaz,
                    personel listesinden sag tik → "Elden Maas Ode" ile manuel odenir.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Durum</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Durum secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Ise Baslama Tarihi</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[200px]"
                />
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Onemli:</strong> Vize ve calisma izni bitis tarihleri yaklastikca sistem sizi uyaracaktir.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visaExpiry">Vize Bitis Tarihi</Label>
                  <Input
                    id="visaExpiry"
                    type="date"
                    value={visaExpiry}
                    onChange={(e) => setVisaExpiry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workPermitExpiry">Calisma Izni Bitis</Label>
                  <Input
                    id="workPermitExpiry"
                    type="date"
                    value={workPermitExpiry}
                    onChange={(e) => setWorkPermitExpiry(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalId">Kimlik No</Label>
                  <Input
                    id="nationalId"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="TC Kimlik / Pasaport No"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Vergi No</Label>
                  <Input
                    id="taxNumber"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="Vergi numarasi"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Personel hakkinda ek notlar, ozel durumlar..."
                  rows={8}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Iptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Personeli Kaydet'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
