'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { subscribeToFirestore } from '@/services/firebase';
import {
  Loader2, RefreshCw, Download, Printer, Users,
  TrendingUp, Building2, DollarSign, FileText,
  UserCheck, UserX, Clock, AlertTriangle, CheckCircle,
  Calendar
} from 'lucide-react';

// =================== STAT CARD COMPONENT ===================
function StatCard({
  title,
  value,
  icon,
  color = 'blue',
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}) {
  const colorClasses = {
    blue: 'border-l-amber-500 bg-amber-50',
    green: 'border-l-green-500 bg-green-50',
    red: 'border-l-red-500 bg-red-50',
    amber: 'border-l-amber-500 bg-amber-50',
    purple: 'border-l-purple-500 bg-purple-50',
  };

  const textColors = {
    blue: 'text-amber-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`rounded-lg border-l-4 p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        {icon}
      </div>
      <span className={`text-2xl font-bold ${textColors[color]}`}>{value}</span>
    </div>
  );
}

// =================== STATUS BADGE ===================
function StatusBadge({ status }: { status: 'expired' | 'warning' | 'ok' }) {
  const styles = {
    expired: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    ok: 'bg-green-100 text-green-800',
  };

  const labels = {
    expired: 'Suresi Dolmus',
    warning: 'Yakinda Dolacak',
    ok: 'Guncel',
  };

  const icons = {
    expired: <AlertTriangle className="h-3 w-3 mr-1" />,
    warning: <Clock className="h-3 w-3 mr-1" />,
    ok: <CheckCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
}

// =================== INTERFACES ===================
interface Employee {
  id: string;
  personal_info?: {
    full_name?: string;
    nationality?: string;
  };
  work_info?: {
    position?: string;
    department?: string;
    status?: string;
    monthly_salary?: number;
    cash_salary?: number;
    hire_date?: string;
  };
  employment_info?: {
    department?: string;
    position?: string;
  };
  salary_info?: {
    monthly_salary?: number;
    cash_salary?: number;
  };
  documents?: {
    visa_expiry_date?: string;
    residence_permit_expiry?: string;
    work_permit_expiry?: string;
  };
  visa_info?: {
    visa_expiry_date?: string;
  };
  // Flat structure support
  name?: string;
  department?: string;
  position?: string;
  salary?: number;
}

interface EmployeeReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =================== MAIN COMPONENT ===================
export function EmployeeReportDialog({ open, onOpenChange }: EmployeeReportDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  // =================== LOAD DATA ===================
  useEffect(() => {
    if (!open) return;

    setLoading(true);

    const unsubEmployees = subscribeToFirestore('employees', (data) => {
      setEmployees(data || []);
      setLoading(false);
    });

    return () => {
      unsubEmployees();
    };
  }, [open]);

  // =================== HELPER FUNCTIONS ===================
  const getEmployeeName = (emp: Employee): string => {
    return emp.personal_info?.full_name || emp.name || '-';
  };

  const getEmployeeDepartment = (emp: Employee): string => {
    return emp.work_info?.department || emp.employment_info?.department || emp.department || '-';
  };

  const getEmployeePosition = (emp: Employee): string => {
    return emp.work_info?.position || emp.employment_info?.position || emp.position || '-';
  };

  const getEmployeeStatus = (emp: Employee): string => {
    return emp.work_info?.status || 'Aktif';
  };

  const getEmployeeSalary = (emp: Employee): number => {
    const monthly = emp.work_info?.monthly_salary || emp.salary_info?.monthly_salary || emp.salary || 0;
    const cash = emp.work_info?.cash_salary || emp.salary_info?.cash_salary || 0;
    return monthly + cash;
  };

  const getVisaExpiryStatus = (dateStr?: string): 'expired' | 'warning' | 'ok' => {
    if (!dateStr || dateStr === '-' || dateStr === '9999-12-31') return 'ok';

    try {
      const expiryDate = new Date(dateStr);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (expiryDate < today) return 'expired';
      if (expiryDate < thirtyDaysFromNow) return 'warning';
      return 'ok';
    } catch {
      return 'ok';
    }
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr || dateStr === '-' || dateStr === '9999-12-31') return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR');
    } catch {
      return dateStr;
    }
  };

  // =================== SUMMARY STATS ===================
  const summaryStats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => getEmployeeStatus(e) === 'Aktif').length;
    const onLeave = employees.filter(e => getEmployeeStatus(e) === 'Izinli').length;
    const totalSalary = employees.reduce((sum, e) => sum + getEmployeeSalary(e), 0);
    const avgSalary = total > 0 ? totalSalary / total : 0;

    return { total, active, onLeave, totalSalary, avgSalary };
  }, [employees]);

  // =================== POSITION DISTRIBUTION ===================
  const positionDistribution = useMemo(() => {
    const positions: Record<string, number> = {};
    employees.forEach(emp => {
      const pos = getEmployeePosition(emp);
      positions[pos] = (positions[pos] || 0) + 1;
    });

    const total = employees.length;
    return Object.entries(positions)
      .map(([position, count]) => ({
        position,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  // =================== DEPARTMENT STATS ===================
  const departmentStats = useMemo(() => {
    const deptData: Record<string, { count: number; totalSalary: number }> = {};

    employees.forEach(emp => {
      const dept = getEmployeeDepartment(emp);
      const salary = getEmployeeSalary(emp);

      if (!deptData[dept]) {
        deptData[dept] = { count: 0, totalSalary: 0 };
      }

      deptData[dept].count++;
      deptData[dept].totalSalary += salary;
    });

    const total = employees.length;
    return Object.entries(deptData)
      .map(([department, data]) => ({
        department,
        count: data.count,
        totalSalary: data.totalSalary,
        avgSalary: data.count > 0 ? data.totalSalary / data.count : 0,
        percentage: total > 0 ? (data.count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  // =================== SALARY STATS ===================
  const salaryStats = useMemo(() => {
    const salaries = employees.map(e => getEmployeeSalary(e)).filter(s => s > 0);

    if (salaries.length === 0) {
      return { min: 0, max: 0, total: 0 };
    }

    return {
      min: Math.min(...salaries),
      max: Math.max(...salaries),
      total: salaries.reduce((sum, s) => sum + s, 0),
    };
  }, [employees]);

  // =================== SALARY BY POSITION ===================
  const salaryByPosition = useMemo(() => {
    const positionSalaries: Record<string, { total: number; count: number }> = {};

    employees.forEach(emp => {
      const pos = getEmployeePosition(emp);
      const salary = getEmployeeSalary(emp);

      if (salary > 0) {
        if (!positionSalaries[pos]) {
          positionSalaries[pos] = { total: 0, count: 0 };
        }
        positionSalaries[pos].total += salary;
        positionSalaries[pos].count++;
      }
    });

    const results = Object.entries(positionSalaries)
      .map(([position, data]) => ({
        position,
        avgSalary: data.count > 0 ? data.total / data.count : 0,
      }))
      .sort((a, b) => b.avgSalary - a.avgSalary);

    const maxSalary = results.length > 0 ? results[0].avgSalary : 0;

    return results.map(item => ({
      ...item,
      percentage: maxSalary > 0 ? (item.avgSalary / maxSalary) * 100 : 0,
    }));
  }, [employees]);

  // =================== VISA DATA ===================
  const visaData = useMemo(() => {
    return employees.map(emp => {
      const visaExpiry = emp.documents?.visa_expiry_date || emp.visa_info?.visa_expiry_date;
      const residenceExpiry = emp.documents?.residence_permit_expiry;
      const workPermitExpiry = emp.documents?.work_permit_expiry;

      const visaStatus = getVisaExpiryStatus(visaExpiry);
      const residenceStatus = getVisaExpiryStatus(residenceExpiry);
      const workStatus = getVisaExpiryStatus(workPermitExpiry);

      // Overall status is the worst of the three
      let overallStatus: 'expired' | 'warning' | 'ok' = 'ok';
      if (visaStatus === 'expired' || residenceStatus === 'expired' || workStatus === 'expired') {
        overallStatus = 'expired';
      } else if (visaStatus === 'warning' || residenceStatus === 'warning' || workStatus === 'warning') {
        overallStatus = 'warning';
      }

      return {
        id: emp.id,
        name: getEmployeeName(emp),
        visaExpiry: formatDate(visaExpiry),
        residenceExpiry: formatDate(residenceExpiry),
        workPermitExpiry: formatDate(workPermitExpiry),
        status: overallStatus,
      };
    }).sort((a, b) => {
      const statusOrder = { expired: 0, warning: 1, ok: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [employees]);

  // =================== RECENT HIRES ===================
  const recentHires = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return employees
      .filter(emp => {
        const hireDate = emp.work_info?.hire_date;
        if (!hireDate) return false;
        try {
          return new Date(hireDate) >= thirtyDaysAgo;
        } catch {
          return false;
        }
      })
      .map(emp => ({
        id: emp.id,
        name: getEmployeeName(emp),
        position: getEmployeePosition(emp),
        department: getEmployeeDepartment(emp),
        hireDate: formatDate(emp.work_info?.hire_date),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.hireDate);
        const dateB = new Date(b.hireDate);
        return dateB.getTime() - dateA.getTime();
      });
  }, [employees]);

  // =================== HANDLERS ===================
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleExport = () => {
    alert('Excel export ozeligi yakinda...');
  };

  const handlePrint = () => {
    window.print();
  };

  // =================== RENDER ===================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-6 w-6 text-amber-600" />
                Personel Rapor Merkezi
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Toplam {employees.length} personel - {new Date().toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Yazdir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="summary">Ozet Istatistikler</TabsTrigger>
                <TabsTrigger value="department">Departman Analizi</TabsTrigger>
                <TabsTrigger value="salary">Maas Analizi</TabsTrigger>
                <TabsTrigger value="visa">Vize & Belge</TabsTrigger>
              </TabsList>

              {/* =================== SUMMARY TAB =================== */}
              <TabsContent value="summary" className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <StatCard
                    title="Toplam Personel"
                    value={summaryStats.total.toString()}
                    icon={<Users className="h-5 w-5 text-amber-600" />}
                    color="blue"
                  />
                  <StatCard
                    title="Aktif Personel"
                    value={summaryStats.active.toString()}
                    icon={<UserCheck className="h-5 w-5 text-green-600" />}
                    color="green"
                  />
                  <StatCard
                    title="Izinli"
                    value={summaryStats.onLeave.toString()}
                    icon={<UserX className="h-5 w-5 text-amber-600" />}
                    color="amber"
                  />
                  <StatCard
                    title="Ortalama Maas"
                    value={`€${summaryStats.avgSalary.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                    icon={<DollarSign className="h-5 w-5 text-purple-600" />}
                    color="purple"
                  />
                </div>

                {/* Position Distribution */}
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Pozisyon Dagilimi</h4>
                  <div className="space-y-3">
                    {positionDistribution.slice(0, 8).map((item) => (
                      <div key={item.position}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{item.position}</span>
                          <span className="text-gray-500">{item.count} kisi ({item.percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Hires */}
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-600" />
                    Son Ise Alinanlar (30 Gun)
                  </h4>
                  {recentHires.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Son 30 gunde yeni ise alim yok</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ad Soyad</TableHead>
                          <TableHead>Pozisyon</TableHead>
                          <TableHead>Departman</TableHead>
                          <TableHead>Ise Baslama</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentHires.map((hire) => (
                          <TableRow key={hire.id}>
                            <TableCell className="font-medium">{hire.name}</TableCell>
                            <TableCell>{hire.position}</TableCell>
                            <TableCell>{hire.department}</TableCell>
                            <TableCell>{hire.hireDate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              {/* =================== DEPARTMENT TAB =================== */}
              <TabsContent value="department" className="space-y-6">
                {/* Department Distribution */}
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Departman Dagilimi</h4>
                  <div className="space-y-3">
                    {departmentStats.slice(0, 8).map((item, index) => {
                      const colors = ['bg-amber-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500', 'bg-teal-500'];
                      return (
                        <div key={item.department}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{item.department}</span>
                            <span className="text-gray-500">{item.count} kisi ({item.percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[index % colors.length]} rounded-full`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Department Details Table */}
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <h4 className="font-semibold text-gray-900">Departman Detaylari</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Departman</TableHead>
                        <TableHead className="text-right">Personel</TableHead>
                        <TableHead className="text-right">Ort. Maas</TableHead>
                        <TableHead className="text-right">Toplam Maas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentStats.map((item) => (
                        <TableRow key={item.department}>
                          <TableCell className="font-medium">{item.department}</TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">
                            €{item.avgSalary.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            €{item.totalSalary.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* =================== SALARY TAB =================== */}
              <TabsContent value="salary" className="space-y-6">
                {/* Salary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    title="Toplam Maas Gideri"
                    value={`€${salaryStats.total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                    icon={<DollarSign className="h-5 w-5 text-red-600" />}
                    color="red"
                  />
                  <StatCard
                    title="En Dusuk Maas"
                    value={`€${salaryStats.min.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                    icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
                    color="blue"
                  />
                  <StatCard
                    title="En Yuksek Maas"
                    value={`€${salaryStats.max.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    color="green"
                  />
                </div>

                {/* Salary by Position */}
                <div className="bg-white rounded-lg border p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Pozisyona Gore Ortalama Maas</h4>
                  <div className="space-y-3">
                    {salaryByPosition.map((item) => (
                      <div key={item.position}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{item.position}</span>
                          <span className="text-green-600 font-semibold">
                            €{item.avgSalary.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* =================== VISA TAB =================== */}
              <TabsContent value="visa" className="space-y-4">
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-amber-600" />
                      Vize & Belge Takibi
                    </h4>
                  </div>
                  <div className="max-h-[450px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ad Soyad</TableHead>
                          <TableHead>Vize Bitis</TableHead>
                          <TableHead>Ikamet Izni</TableHead>
                          <TableHead>Calisma Izni</TableHead>
                          <TableHead>Durum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visaData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.visaExpiry}</TableCell>
                            <TableCell>{item.residenceExpiry}</TableCell>
                            <TableCell>{item.workPermitExpiry}</TableCell>
                            <TableCell>
                              <StatusBadge status={item.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-800">Suresi Dolmus</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {visaData.filter(v => v.status === 'expired').length}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-800">Yakinda Dolacak</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">
                      {visaData.filter(v => v.status === 'warning').length}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Guncel</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {visaData.filter(v => v.status === 'ok').length}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
