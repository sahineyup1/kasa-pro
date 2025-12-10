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
import { addFirestoreData, updateFirestoreData } from '@/services/firebase';
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
  const [salary, setSalary] = useState('');
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
        // Edit mode - load existing data
        setFirstName(getField(employee, ['personal', 'firstName'], 'firstName', ''));
        setLastName(getField(employee, ['personal', 'lastName'], 'lastName', ''));
        setPhone(getField(employee, ['personal', 'phone'], 'phone', ''));
        setEmail(getField(employee, ['personal', 'email'], 'email', ''));
        setAddress(getField(employee, ['personal', 'address'], 'address', ''));
        setDateOfBirth(getField(employee, ['personal', 'dateOfBirth'], 'dateOfBirth', ''));
        setNationality(getField(employee, ['personal', 'nationality'], 'nationality', ''));

        setRole(getField(employee, ['employment', 'role'], 'role', 'kasiyer'));
        setBranch(getField(employee, ['employment', 'branch'], 'branch', ''));
        setSalary(String(getField(employee, ['employment', 'salary'], 'salary', '') || ''));
        setStatus(getField(employee, ['employment', 'status'], 'status', 'active'));
        setStartDate(getField(employee, ['employment', 'startDate'], 'startDate', ''));

        setVisaExpiry(getField(employee, ['documents', 'visaExpiry'], 'visaExpiry', ''));
        setWorkPermitExpiry(getField(employee, ['documents', 'workPermitExpiry'], 'workPermitExpiry', ''));
        setNationalId(getField(employee, ['documents', 'nationalId'], 'nationalId', ''));
        setTaxNumber(getField(employee, ['documents', 'taxNumber'], 'taxNumber', ''));

        setNotes(getField(employee, [], 'notes', ''));
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
        setSalary('');
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
      const employeeData = {
        personal: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          dateOfBirth,
          nationality: nationality.trim(),
        },
        employment: {
          role,
          branch,
          salary: parseFloat(salary) || 0,
          status,
          startDate,
        },
        documents: {
          visaExpiry: visaExpiry || null,
          workPermitExpiry: workPermitExpiry || null,
          nationalId: nationalId.trim(),
          taxNumber: taxNumber.trim(),
        },
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && employee?.id) {
        await updateFirestoreData('employees', employee.id, employeeData);
      } else {
        await addFirestoreData('employees', {
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Maas (EUR)</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="0.00"
                  />
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
