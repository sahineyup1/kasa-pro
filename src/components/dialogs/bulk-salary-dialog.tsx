'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { subscribeToData, pushData, updateData } from '@/services/firebase';
import { Wallet, Building2, Users, AlertTriangle, CheckCircle2, XCircle, Banknote } from 'lucide-react';

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  salary?: number;
  cashSalary?: number;
  status?: string;
  personal_info?: {
    full_name?: string;
  };
  salary_info?: {
    monthly_salary?: number;
    cash_salary?: number;
    lastPaymentDate?: string;
    lastPaymentMonth?: string;
  };
  employment_info?: {
    position?: string;
    role?: string;
  };
}

interface LeaveRecord {
  id: string;
  employeeId: string;
  deduction: number;
  days: number;
}

interface EmployeePayment {
  id: string;
  name: string;
  position: string;
  bankSalary: number;
  cashSalary: number;
  deduction: number;
  leaveDays: number;
  netBankSalary: number;
  selected: boolean;
  bankAmount: number;
  isPaid: boolean;
  lastPaymentMonth: string | null;
}

interface BulkSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
}

export function BulkSalaryDialog({ open, onOpenChange, employees }: BulkSalaryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<any[]>([]);

  // Get current month for filtering
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthLabel = useMemo(() => {
    return new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  }, []);

  // Load leaves and salary payments for current month
  useEffect(() => {
    if (!open) return;

    const unsubLeaves = subscribeToData('employee_leaves', (data) => {
      if (data) {
        const leaveList = Object.entries(data)
          .map(([id, leave]: [string, any]) => ({ id, ...leave }))
          .filter((leave) => leave.status === 'active' && leave.month === currentMonth);
        setLeaves(leaveList);
      } else {
        setLeaves([]);
      }
    });

    const unsubPayments = subscribeToData('salary_payments', (data) => {
      if (data) {
        const paymentList = Object.entries(data)
          .map(([id, payment]: [string, any]) => ({ id, ...payment }))
          .filter((p) => p.month === currentMonth && p.status === 'paid' && p.paymentType === 'bank');
        setSalaryPayments(paymentList);
      } else {
        setSalaryPayments([]);
      }
    });

    return () => {
      unsubLeaves();
      unsubPayments();
    };
  }, [open, currentMonth]);

  // Initialize employee payments when dialog opens
  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().split('T')[0];
    setPaymentDate(today);

    // Filter only active employees with bank salary
    const activeEmployees = employees.filter((emp) => {
      const status = emp.status || 'active';
      return status === 'active' || status === 'aktif';
    });

    const payments = activeEmployees.map((emp) => {
      const name = emp.personal_info?.full_name ||
                   emp.fullName ||
                   `${emp.firstName || ''} ${emp.lastName || ''}`.trim() ||
                   'Bilinmiyor';

      const position = emp.employment_info?.position ||
                       emp.employment_info?.role ||
                       '';

      const bankSalary = emp.salary_info?.monthly_salary || emp.salary || 0;
      const cashSalary = emp.salary_info?.cash_salary || emp.cashSalary || 0;
      const lastPaymentMonth = emp.salary_info?.lastPaymentMonth || null;

      // Check if already paid this month
      const isPaid = salaryPayments.some((p) => p.employeeId === emp.id);

      // Calculate leave deductions
      const empLeaves = leaves.filter((l) => l.employeeId === emp.id);
      const deduction = empLeaves.reduce((sum, l) => sum + (l.deduction || 0), 0);
      const leaveDays = empLeaves.reduce((sum, l) => sum + (l.days || 0), 0);

      const netBankSalary = Math.max(0, bankSalary - deduction);

      return {
        id: emp.id,
        name,
        position,
        bankSalary,
        cashSalary,
        deduction,
        leaveDays,
        netBankSalary,
        selected: !isPaid && bankSalary > 0,
        bankAmount: netBankSalary,
        isPaid,
        lastPaymentMonth,
      };
    });

    // Sort: unpaid first, then paid
    payments.sort((a, b) => {
      if (a.isPaid === b.isPaid) return a.name.localeCompare(b.name);
      return a.isPaid ? 1 : -1;
    });

    setEmployeePayments(payments);
  }, [open, employees, leaves, salaryPayments]);

  // Toggle employee selection
  const toggleEmployee = (empId: string) => {
    setEmployeePayments((prev) =>
      prev.map((emp) =>
        emp.id === empId && !emp.isPaid ? { ...emp, selected: !emp.selected } : emp
      )
    );
  };

  // Update bank amount
  const updateBankAmount = (empId: string, amount: number) => {
    setEmployeePayments((prev) =>
      prev.map((emp) =>
        emp.id === empId ? { ...emp, bankAmount: amount } : emp
      )
    );
  };

  // Select/deselect all unpaid
  const selectAllUnpaid = () => {
    setEmployeePayments((prev) =>
      prev.map((emp) => ({ ...emp, selected: !emp.isPaid && emp.bankSalary > 0 }))
    );
  };

  const deselectAll = () => {
    setEmployeePayments((prev) => prev.map((emp) => ({ ...emp, selected: false })));
  };

  // Calculate totals
  const totals = useMemo(() => {
    const selected = employeePayments.filter((e) => e.selected && !e.isPaid);
    const unpaid = employeePayments.filter((e) => !e.isPaid && e.bankSalary > 0);
    const paid = employeePayments.filter((e) => e.isPaid);
    const withCashSalary = employeePayments.filter((e) => e.cashSalary > 0 && !e.isPaid);

    return {
      selectedCount: selected.length,
      unpaidCount: unpaid.length,
      paidCount: paid.length,
      withCashCount: withCashSalary.length,
      bankTotal: selected.reduce((sum, e) => sum + e.bankAmount, 0),
      deductionTotal: selected.reduce((sum, e) => sum + e.deduction, 0),
      totalCashPending: withCashSalary.reduce((sum, e) => sum + e.cashSalary, 0),
    };
  }, [employeePayments]);

  // Process payments
  const handleProcessPayments = async () => {
    const selectedPayments = employeePayments.filter((e) => e.selected && !e.isPaid && e.bankAmount > 0);

    if (selectedPayments.length === 0) {
      alert('Odeme yapilacak personel seciniz');
      return;
    }

    const confirmMsg = `${selectedPayments.length} personele toplam €${totals.bankTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} BANKA odemesi yapilacak.\n\nOnayliyor musunuz?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const payment of selectedPayments) {
      try {
        const salaryRecord = {
          employeeId: payment.id,
          employeeName: payment.name,
          amount: payment.bankAmount,
          grossAmount: payment.bankSalary,
          deduction: payment.deduction,
          paymentDate,
          paymentType: 'bank',
          paymentMethod: 'bank_transfer',
          type: 'salary',
          status: 'paid',
          createdAt: new Date().toISOString(),
          month: currentMonth,
        };

        await pushData('salary_payments', salaryRecord);

        await updateData(`employees/${payment.id}/salary_info`, {
          lastPaymentDate: paymentDate,
          lastPaymentMonth: currentMonth,
          lastBankPayment: payment.bankAmount,
        });

        successCount++;
      } catch (error) {
        console.error(`Payment error for ${payment.name}:`, error);
        errors.push(`${payment.name}: ${(error as Error).message}`);
      }
    }

    setLoading(false);

    if (errors.length > 0) {
      alert(`${successCount} odeme basarili, ${errors.length} basarisiz.\n\nHatalar:\n${errors.join('\n')}`);
    } else {
      alert(`${successCount} personele banka maaş odemesi yapildi!`);
      onOpenChange(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-blue-600 -m-6 mb-0 p-6 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <Building2 className="h-6 w-6" />
            Toplu Banka Maaş Odemesi
          </DialogTitle>
          <DialogDescription className="text-blue-100">
            {currentMonthLabel} - Sadece resmi (banka) maaslari
          </DialogDescription>
        </DialogHeader>

        {/* Info banner for cash salaries */}
        {totals.withCashCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
            <Banknote className="h-5 w-5 text-amber-600" />
            <div className="text-sm text-amber-800">
              <strong>{totals.withCashCount} personelin</strong> elden maaşı var (toplam {formatCurrency(totals.totalCashPending)}).
              Elden ödemeler için personel listesinde sağ tık → "Elden Maaş Öde" kullanın.
            </div>
          </div>
        )}

        {/* Settings row */}
        <div className="flex items-center gap-6 py-3 border-b">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-gray-600">Odeme Tarihi:</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" /> {totals.paidCount} odendi
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-orange-600">
              <XCircle className="h-4 w-4" /> {totals.unpaidCount} bekliyor
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={selectAllUnpaid}>
            Odenmemisleri Sec
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Secimi Kaldir
          </Button>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {employeePayments.map((emp) => (
            <div
              key={emp.id}
              className={`border rounded-lg p-3 transition-all ${
                emp.isPaid
                  ? 'border-green-200 bg-green-50'
                  : emp.selected
                  ? 'border-blue-300 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Checkbox or paid indicator */}
                {emp.isPaid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Checkbox
                    checked={emp.selected}
                    onCheckedChange={() => toggleEmployee(emp.id)}
                    disabled={emp.bankSalary === 0}
                  />
                )}

                {/* Name and position */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${emp.isPaid ? 'text-green-800' : 'text-gray-900'}`}>
                      {emp.name}
                    </h4>
                    {emp.position && (
                      <span className="text-sm text-gray-500">{emp.position}</span>
                    )}
                    {emp.isPaid && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Bu ay odendi
                      </span>
                    )}
                    {emp.cashSalary > 0 && !emp.isPaid && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        Elden: {formatCurrency(emp.cashSalary)}
                      </span>
                    )}
                  </div>

                  {/* Leave warning */}
                  {emp.deduction > 0 && !emp.isPaid && (
                    <div className="mt-1 flex items-center gap-1 text-amber-600 text-sm">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{emp.leaveDays} gun izin - Kesinti: {formatCurrency(emp.deduction)}</span>
                    </div>
                  )}
                </div>

                {/* Salary info */}
                <div className="flex items-center gap-4">
                  {/* Bank salary display */}
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Banka Maasi</div>
                    {emp.deduction > 0 && !emp.isPaid ? (
                      <div>
                        <span className="text-sm text-gray-400 line-through mr-2">
                          {formatCurrency(emp.bankSalary)}
                        </span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(emp.netBankSalary)}
                        </span>
                      </div>
                    ) : (
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(emp.bankSalary)}
                      </div>
                    )}
                  </div>

                  {/* Payment input (only for unpaid) */}
                  {!emp.isPaid && emp.bankSalary > 0 && (
                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                        <Input
                          type="number"
                          value={emp.bankAmount}
                          onChange={(e) => updateBankAmount(emp.id, parseFloat(e.target.value) || 0)}
                          className="pl-6 text-right font-medium h-9"
                          disabled={!emp.selected}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 -mx-6 px-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-5 w-5" />
                <span className="font-medium">{totals.selectedCount} personel secili</span>
              </div>

              {totals.deductionTotal > 0 && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Kesinti: {formatCurrency(totals.deductionTotal)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Toplam Banka Odemesi</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totals.bankTotal)}
                </div>
              </div>

              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Iptal
              </Button>
              <Button
                onClick={handleProcessPayments}
                disabled={loading || totals.selectedCount === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Building2 className="h-4 w-4 mr-2" />
                {loading ? 'Isleniyor...' : 'Banka Odemelerini Yap'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
