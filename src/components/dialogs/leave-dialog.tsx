'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subscribeToData, pushData, updateData, removeData } from '@/services/firebase';
import { CalendarDays, FileText, Calculator, Trash2, Plus } from 'lucide-react';

// Slovenya kanunlarına uygun izin türleri ve kesinti oranları
const LEAVE_TYPES = [
  { id: 'unpaid_leave', name: 'Ucretsiz Izin', description: 'Maastan tam kesinti yapilir', rate: 0 },
  { id: 'annual_leave', name: 'Yillik Izin', description: 'Maas tam odenir', rate: 1 },
  { id: 'sick_leave', name: 'Hastalik Raporu (Bolniska)', description: 'Ilk 30 gun %80, sonrasi ZZZS', rate: 0.8 },
  { id: 'work_accident', name: 'Is Kazasi', description: 'Tam maas odenir', rate: 1 },
];

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  salary?: number;
  personal_info?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
  salary_info?: {
    monthly_salary?: number;
    cash_salary?: number;
  };
}

interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  dailySalary: number;
  deduction: number;
  note: string;
  status: string;
  createdAt: string;
  month: string;
}

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
}

export function LeaveDialog({ open, onOpenChange, employees }: LeaveDialogProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('unpaid_leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');

  // Load leave records
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeToData('employee_leaves', (data) => {
      if (data) {
        const leaveList = Object.entries(data)
          .map(([id, leave]: [string, any]) => ({
            id,
            ...leave,
          }))
          .filter((leave) => leave.status === 'active')
          .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
        setLeaves(leaveList);
      } else {
        setLeaves([]);
      }
    });

    return () => unsubscribe();
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setSelectedEmployeeId('');
      setLeaveType('unpaid_leave');
      setNote('');
    }
  }, [open]);

  // Get selected employee
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Get employee name
  const getEmployeeName = (emp: Employee): string => {
    return emp.personal_info?.full_name ||
           emp.fullName ||
           `${emp.firstName || ''} ${emp.lastName || ''}`.trim() ||
           'Bilinmiyor';
  };

  // Get employee salary
  const getEmployeeSalary = (emp: Employee): number => {
    return emp.salary_info?.monthly_salary || emp.salary || 0;
  };

  // Calculate days between dates
  const calculateDays = (): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays);
  };

  // Calculate deduction
  const calculateDeduction = (): { deduction: number; dailySalary: number; details: string } => {
    const days = calculateDays();
    if (!selectedEmployee || days === 0) {
      return { deduction: 0, dailySalary: 0, details: '' };
    }

    const monthlySalary = getEmployeeSalary(selectedEmployee);
    const dailySalary = monthlySalary / 30;

    const leaveInfo = LEAVE_TYPES.find((t) => t.id === leaveType);
    if (!leaveInfo) {
      return { deduction: 0, dailySalary, details: '' };
    }

    let deduction = 0;
    let details = '';

    if (leaveType === 'unpaid_leave') {
      deduction = dailySalary * days;
      details = `Gunluk maas: €${dailySalary.toFixed(2)} x ${days} gun = €${deduction.toFixed(2)} kesinti`;
    } else if (leaveType === 'annual_leave') {
      deduction = 0;
      details = `Yillik izin - kesinti yok, tam maas odenir`;
    } else if (leaveType === 'sick_leave') {
      // First 30 days: employer pays 80%
      const employerPays = dailySalary * 0.8 * days;
      deduction = dailySalary * days - employerPays;
      details = `Ilk 30 gun %80 odenir. Kesinti: €${deduction.toFixed(2)} (%20)`;
    } else if (leaveType === 'work_accident') {
      deduction = 0;
      details = `Is kazasi - kesinti yok, tam maas odenir`;
    }

    return { deduction, dailySalary, details };
  };

  const { deduction, dailySalary, details } = calculateDeduction();
  const days = calculateDays();

  // Save leave record
  const handleSave = async () => {
    if (!selectedEmployeeId || !startDate || !endDate) {
      alert('Lutfen tum alanlari doldurun');
      return;
    }

    if (days <= 0) {
      alert('Bitis tarihi baslangic tarihinden once olamaz');
      return;
    }

    setLoading(true);
    try {
      const leaveInfo = LEAVE_TYPES.find((t) => t.id === leaveType);
      const employeeName = selectedEmployee ? getEmployeeName(selectedEmployee) : '';

      const leaveRecord = {
        employeeId: selectedEmployeeId,
        employeeName,
        leaveType,
        leaveTypeName: leaveInfo?.name || '',
        startDate,
        endDate,
        days,
        dailySalary,
        deduction,
        note: note.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        month: startDate.substring(0, 7), // YYYY-MM format for salary calculation
      };

      await pushData('employee_leaves', leaveRecord);
      alert(`${employeeName} icin ${days} gunluk izin/rapor kaydedildi.`);

      // Reset form
      setSelectedEmployeeId('');
      setLeaveType('unpaid_leave');
      setNote('');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);

      // Switch to list tab
      setActiveTab('list');
    } catch (error) {
      console.error('Leave save error:', error);
      alert('Kayit hatasi: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Delete leave record
  const handleDelete = async (leaveId: string) => {
    if (!confirm('Bu izin/rapor kaydini silmek istediginize emin misiniz?')) {
      return;
    }

    try {
      await updateData(`employee_leaves/${leaveId}`, { status: 'deleted' });
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme hatasi: ' + (error as Error).message);
    }
  };

  // Format date as dd.mm.yyyy
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Izin/Rapor Yonetimi
          </DialogTitle>
          <DialogDescription>
            Personel izin ve hastalik raporu yonetimi - Slovenya kanunlarina uygun hesaplama
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'new'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('new')}
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Yeni Kayit
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'list'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('list')}
          >
            <FileText className="h-4 w-4 inline mr-1" />
            Kayitlar ({leaves.length})
          </button>
        </div>

        {activeTab === 'new' ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Left column - Form */}
            <div className="space-y-4">
              {/* Employee selection */}
              <div className="space-y-2">
                <Label>Personel</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Personel secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {getEmployeeName(emp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmployee && (
                  <p className="text-sm text-gray-500">
                    Aylik Maas: €{getEmployeeSalary(selectedEmployee).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} |
                    Gunluk: €{(getEmployeeSalary(selectedEmployee) / 30).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Leave type selection */}
              <div className="space-y-2">
                <Label>Izin Turu</Label>
                <div className="space-y-2">
                  {LEAVE_TYPES.map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                        leaveType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="leaveType"
                        value={type.id}
                        checked={leaveType === type.id}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Baslangic Tarihi</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bitis Tarihi</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Days badge */}
              {days > 0 && (
                <div className="flex justify-center">
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                    {days} gun
                  </span>
                </div>
              )}
            </div>

            {/* Right column - Note & Calculation */}
            <div className="space-y-4">
              {/* Note */}
              <div className="space-y-2">
                <Label>Aciklama (Opsiyonel)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Izin/rapor hakkinda not..."
                  rows={3}
                />
              </div>

              {/* Calculation summary */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Maas Hesaplamasi
                </h4>

                {selectedEmployee && days > 0 ? (
                  <>
                    <div className="text-sm text-gray-700 space-y-1 mb-3">
                      <p>Gunluk maas: €{dailySalary.toFixed(2)}</p>
                      <p>Izin gunu: {days} gun</p>
                      <p>{details}</p>
                    </div>
                    <div className={`text-lg font-bold pt-3 border-t border-blue-200 ${
                      deduction > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {deduction > 0
                        ? `Kesinti: -€${deduction.toFixed(2)}`
                        : 'Kesinti: €0.00 (Tam maas)'}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Hesaplama icin personel secin ve tarihleri girin
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List tab */
          <div className="max-h-[400px] overflow-y-auto">
            {leaves.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henuz izin/rapor kaydi yok
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Personel</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tur</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tarih</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Gun</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Kesinti</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{leave.employeeName}</td>
                      <td className="px-4 py-3 text-sm">{leave.leaveTypeName}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{leave.days}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        leave.deduction > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {leave.deduction > 0 ? `-€${leave.deduction.toFixed(2)}` : '€0.00'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(leave.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          {activeTab === 'new' && (
            <Button onClick={handleSave} disabled={loading || !selectedEmployeeId || days <= 0}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
