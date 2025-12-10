'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { subscribeToData, updateData, removeData } from '@/services/firebase';
import { EmployeeDialog } from '@/components/dialogs/employee-dialog';
import { LeaveDialog } from '@/components/dialogs/leave-dialog';
import { BulkSalaryDialog } from '@/components/dialogs/bulk-salary-dialog';
import {
  Plus, RefreshCw, MoreHorizontal, Pencil, Trash2, Eye, Search,
  Users, UserCheck, AlertTriangle, Wallet, Calendar, FileText, Banknote
} from 'lucide-react';
import { pushData } from '@/services/firebase';

// Role labels
const ROLE_LABELS: Record<string, string> = {
  'admin': 'Admin',
  'kasap': 'Kasap',
  'kasiyer': 'Kasiyer',
  'depo': 'Depo',
  'depo_muduru': 'Depo Muduru',
  'sofor': 'Sofor',
  'finans': 'Finans',
};

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'active': 'bg-green-100 text-green-800',
    'aktif': 'bg-green-100 text-green-800',
    'inactive': 'bg-gray-100 text-gray-600',
    'pasif': 'bg-gray-100 text-gray-600',
    'on_leave': 'bg-amber-100 text-amber-800',
    'izinli': 'bg-amber-100 text-amber-800',
    'terminated': 'bg-red-100 text-red-800',
    'isten_ayrildi': 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    'active': 'Aktif',
    'aktif': 'Aktif',
    'inactive': 'Pasif',
    'pasif': 'Pasif',
    'on_leave': 'Izinli',
    'izinli': 'Izinli',
    'terminated': 'Ayrildi',
    'isten_ayrildi': 'Ayrildi',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

// Format date as dd.mm.yyyy
function formatDateTR(dateStr: string | null): string {
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
}

// Visa warning badge
function VisaBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span className="text-gray-400">-</span>;

  // "9999-12-31" means permanent/unlimited
  if (expiryDate === '9999-12-31' || expiryDate.startsWith('9999')) {
    return <span className="text-green-600 font-medium">Suresiz</span>;
  }

  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return <span className="text-red-600 font-medium">Suresi doldu!</span>;
  } else if (daysLeft <= 30) {
    return <span className="text-amber-600 font-medium">{daysLeft} gun kaldi</span>;
  } else if (daysLeft <= 90) {
    return <span className="text-yellow-600">{daysLeft} gun</span>;
  }

  return <span className="text-gray-600">{formatDateTR(expiryDate)}</span>;
}

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: string;
  branch?: string;
  branchId?: string;
  phone?: string;
  email?: string;
  salary?: number;
  status?: string;
  startDate?: string;
  visaExpiry?: string;
  documentExpiry?: string;
  notes?: string;
  // Nested structure support
  personal?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
  employment?: {
    role?: string;
    branch?: string;
    branchId?: string;
    salary?: number;
    status?: string;
    startDate?: string;
  };
  documents?: {
    visaExpiry?: string;
    documentExpiry?: string;
  };
}

// Helper to get field from nested or flat structure
function getField<T>(employee: Employee, nestedPath: string[], flatKey: string, defaultVal: T): T {
  // Try nested first
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

  // Try flat
  const flatValue = (employee as any)[flatKey];
  if (flatValue !== undefined && flatValue !== null) return flatValue as T;

  return defaultVal;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);

  // Load employees from RTDB (same as Python desktop app: erp/employees)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToData('employees', (data) => {
      if (data) {
        // Convert RTDB object to array with IDs
        const employeeList = Object.entries(data).map(([id, emp]: [string, any]) => {
          // Python structure uses personal_info.full_name
          const fullName = emp.personal_info?.full_name || '';
          const nameParts = fullName.split(' ');
          const firstName = emp.personal_info?.first_name || nameParts[0] || emp.firstName || '';
          const lastName = emp.personal_info?.last_name || nameParts.slice(1).join(' ') || emp.lastName || '';

          return {
            id,
            ...emp,
            // Map Python structure to web structure
            firstName,
            lastName,
            fullName,
            role: emp.employment_info?.role || emp.role || '',
            branch: emp.employment_info?.branch || emp.branch || '',
            branchId: emp.employment_info?.branch_id || emp.branchId || '',
            position: emp.employment_info?.position || emp.position || '',
            phone: emp.personal_info?.phone || emp.phone || '',
            email: emp.personal_info?.email || emp.email || '',
            salary: emp.salary_info?.monthly_salary || emp.salary || 0,
            cashSalary: emp.salary_info?.cash_salary || 0,
            sgkIncluded: emp.salary_info?.sgk_included || false,
            status: emp.status || emp.employment_info?.status || 'active',
            startDate: emp.employment_info?.start_date || emp.startDate || '',
            visaExpiry: emp.visa_info?.visa_expiry_date || emp.documents?.visa_expiry_date || emp.visaExpiry || '',
            residenceType: emp.visa_info?.residence_type || '',
            documentExpiry: emp.visa_info?.document_expiry_date || emp.documents?.document_expiry_date || emp.documentExpiry || '',
            notes: emp.notes || '',
            // Keep nested structure for compatibility
            personal: {
              firstName,
              lastName,
              fullName,
              phone: emp.personal_info?.phone || emp.phone || '',
              email: emp.personal_info?.email || emp.email || '',
            },
            employment: {
              role: emp.employment_info?.role || emp.role || '',
              branch: emp.employment_info?.branch || emp.branch || '',
              branchId: emp.employment_info?.branch_id || emp.branchId || '',
              position: emp.employment_info?.position || emp.position || '',
              salary: emp.salary_info?.monthly_salary || emp.salary || 0,
              status: emp.status || emp.employment_info?.status || 'active',
              startDate: emp.employment_info?.start_date || emp.startDate || '',
            },
            documents: {
              visaExpiry: emp.visa_info?.visa_expiry_date || emp.documents?.visa_expiry_date || emp.visaExpiry || '',
              documentExpiry: emp.visa_info?.document_expiry_date || emp.documents?.document_expiry_date || emp.documentExpiry || '',
            },
          };
        });
        console.log('Employees loaded from RTDB:', employeeList.length);
        setEmployees(employeeList);
      } else {
        console.log('No employees in RTDB');
        setEmployees([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      // Search filter
      const firstName = getField(employee, ['personal', 'firstName'], 'firstName', '');
      const lastName = getField(employee, ['personal', 'lastName'], 'lastName', '');
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const phone = getField(employee, ['personal', 'phone'], 'phone', '');
      const email = getField(employee, ['personal', 'email'], 'email', '');

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        fullName.includes(searchLower) ||
        phone.includes(searchLower) ||
        email.toLowerCase().includes(searchLower);

      // Role filter
      const role = getField(employee, ['employment', 'role'], 'role', '');
      const matchesRole = roleFilter === 'all' || role === roleFilter;

      // Status filter
      const status = getField(employee, ['employment', 'status'], 'status', 'active');
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      // Branch filter
      const branch = getField(employee, ['employment', 'branch'], 'branch', '');
      const matchesBranch = branchFilter === 'all' || branch === branchFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesBranch;
    });
  }, [employees, searchQuery, roleFilter, statusFilter, branchFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => {
      const status = getField(e, ['employment', 'status'], 'status', 'active');
      return status === 'active' || status === 'aktif';
    }).length;

    const visaWarning = employees.filter(e => {
      const visaExpiry = getField(e, ['documents', 'visaExpiry'], 'visaExpiry', null);
      if (!visaExpiry) return false;
      const expiry = new Date(visaExpiry);
      const today = new Date();
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 30;
    }).length;

    const totalSalary = employees.reduce((sum, e) => {
      const status = getField(e, ['employment', 'status'], 'status', 'active');
      if (status === 'active' || status === 'aktif') {
        return sum + getField(e, ['employment', 'salary'], 'salary', 0);
      }
      return sum;
    }, 0);

    return { total, active, visaWarning, totalSalary };
  }, [employees]);

  // Get unique branches
  const branches = useMemo(() => {
    const branchSet = new Set<string>();
    employees.forEach(e => {
      const branch = getField(e, ['employment', 'branch'], 'branch', '');
      if (branch) branchSet.add(branch);
    });
    return Array.from(branchSet).sort();
  }, [employees]);

  // Get unique roles
  const roles = useMemo(() => {
    const roleSet = new Set<string>();
    employees.forEach(e => {
      const role = getField(e, ['employment', 'role'], 'role', '');
      if (role) roleSet.add(role);
    });
    return Array.from(roleSet).sort();
  }, [employees]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleCreate = () => {
    setSelectedEmployee(null);
    setDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleView = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      const currentStatus = employee.status || getField(employee, ['employment', 'status'], 'status', 'active');
      const newStatus = currentStatus === 'active' || currentStatus === 'aktif' ? 'inactive' : 'active';

      // Update in RTDB (erp/employees/{id})
      await updateData(`employees/${employee.id}`, {
        status: newStatus,
        'employment_info/status': newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Status update error:', error);
      alert('Durum guncellenemedi: ' + (error as Error).message);
    }
  };

  const handleDelete = async (employee: Employee) => {
    const name = employee.fullName || `${employee.firstName} ${employee.lastName}`.trim() || 'Personel';

    if (!confirm(`"${name}" personelini silmek istediginize emin misiniz?`)) return;

    try {
      // Delete from RTDB (erp/employees/{id})
      await removeData(`employees/${employee.id}`);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme hatasi: ' + (error as Error).message);
    }
  };

  // Elden maaş ödeme
  const handlePayCashSalary = async (employee: Employee) => {
    const name = employee.fullName || `${employee.firstName} ${employee.lastName}`.trim() || 'Personel';
    const cashSalary = (employee as any).salary_info?.cash_salary || (employee as any).cashSalary || 0;

    if (cashSalary <= 0) {
      alert('Bu personelin elden maasi tanimli degil!');
      return;
    }

    const amountStr = prompt(
      `${name} icin elden odeme tutari:\n\nTanimli elden maas: €${cashSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      String(cashSalary)
    );

    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Gecersiz tutar!');
      return;
    }

    if (!confirm(`${name}'e €${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} elden odeme yapilacak. Onayliyor musunuz?`)) {
      return;
    }

    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const today = new Date().toISOString().split('T')[0];

      const salaryRecord = {
        employeeId: employee.id,
        employeeName: name,
        amount: amount,
        grossAmount: cashSalary,
        paymentDate: today,
        paymentType: 'cash',
        paymentMethod: 'cash',
        type: 'salary',
        status: 'paid',
        createdAt: new Date().toISOString(),
        month: currentMonth,
      };

      await pushData('salary_payments', salaryRecord);

      await updateData(`employees/${employee.id}/salary_info`, {
        lastCashPaymentDate: today,
        lastCashPaymentMonth: currentMonth,
        lastCashPayment: amount,
      });

      alert(`${name}'e €${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} elden odeme yapildi!`);
    } catch (error) {
      console.error('Cash payment error:', error);
      alert('Odeme hatasi: ' + (error as Error).message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Personel Yonetimi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Calisan bilgileri, vize takibi ve maas yonetimi
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLeaveDialogOpen(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Izin/Rapor
            </Button>
            <Button variant="outline" size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0" onClick={() => setSalaryDialogOpen(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              Toplu Maas Ode
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Personel
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Personel</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktif Calisan</p>
                <p className="text-xl font-semibold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vize Uyarisi</p>
                <p className="text-xl font-semibold text-amber-600">{stats.visaWarning}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Maas</p>
                <p className="text-xl font-semibold text-gray-900">
                  €{stats.totalSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Personel ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sube" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Subeler</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Roller</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>{ROLE_LABELS[role] || role}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum durumlar</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
              <SelectItem value="on_leave">Izinli</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personel</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sube</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-right">Maas</TableHead>
                <TableHead>Vize/Izin</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Yukleniyor...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || branchFilter !== 'all'
                      ? 'Filtrelere uygun personel bulunamadi'
                      : 'Henuz personel eklenmemis'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  // Use fullName directly from RTDB Python structure
                  const fullName = employee.fullName ||
                    getField(employee, ['personal', 'fullName'], 'fullName', '') ||
                    `${getField(employee, ['personal', 'firstName'], 'firstName', '')} ${getField(employee, ['personal', 'lastName'], 'lastName', '')}`.trim() ||
                    'Bilinmiyor';
                  const firstName = employee.firstName || getField(employee, ['personal', 'firstName'], 'firstName', fullName.split(' ')[0] || '');
                  const lastName = employee.lastName || getField(employee, ['personal', 'lastName'], 'lastName', fullName.split(' ').slice(1).join(' ') || '');
                  const role = employee.role || getField(employee, ['employment', 'role'], 'role', '-');
                  const branch = employee.branch || getField(employee, ['employment', 'branch'], 'branch', '-');
                  const phone = employee.phone || getField(employee, ['personal', 'phone'], 'phone', '-');
                  const email = employee.email || getField(employee, ['personal', 'email'], 'email', '');
                  const salary = employee.salary || getField(employee, ['employment', 'salary'], 'salary', 0);
                  const status = employee.status || getField(employee, ['employment', 'status'], 'status', 'active');
                  const visaExpiry = employee.visaExpiry || getField(employee, ['documents', 'visaExpiry'], 'visaExpiry', null);

                  return (
                    <TableRow key={employee.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                            {firstName.charAt(0)}{lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{fullName}</p>
                            <p className="text-sm text-gray-500">{email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {ROLE_LABELS[role] || role}
                      </TableCell>
                      <TableCell className="text-gray-600">{branch}</TableCell>
                      <TableCell className="text-gray-600">{phone}</TableCell>
                      <TableCell className="text-right font-medium">
                        €{salary.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <VisaBadge expiryDate={visaExpiry} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(employee)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Detaylari Goruntule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Duzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Maas Gecmisi
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handlePayCashSalary(employee)}
                              className="text-green-600"
                            >
                              <Banknote className="h-4 w-4 mr-2" />
                              Elden Maas Ode
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                              {status === 'active' || status === 'aktif' ? '⏸️ Pasif Yap' : '▶️ Aktif Yap'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(employee)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Employee Dialog */}
      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEmployee}
        onSave={() => setDialogOpen(false)}
      />

      {/* Leave Dialog */}
      <LeaveDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        employees={employees}
      />

      {/* Bulk Salary Dialog */}
      <BulkSalaryDialog
        open={salaryDialogOpen}
        onOpenChange={setSalaryDialogOpen}
        employees={employees}
      />
    </div>
  );
}
