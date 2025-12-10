'use client';

import { useState, useEffect } from 'react';
import {
  Receipt,
  Car,
  ShoppingCart,
  Fuel,
  Wrench,
  TrendingUp,
  Loader2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { subscribeToData } from '@/services/firebase';

interface DashboardStats {
  expenseCount: number;
  expenseTotal: number;
  vehicleCount: number;
  fuelTotal: number;
  maintenanceTotal: number;
  purchaseInvoiceCount: number;
  purchaseInvoiceTotal: number;
  unpaidInvoices: number;
}

interface RecentExpense {
  id: string;
  date: string;
  vendor: string;
  totalAmount: number;
  category: string;
}

interface ExpiryWarning {
  plate: string;
  type: string;
  date: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    expenseCount: 0,
    expenseTotal: 0,
    vehicleCount: 0,
    fuelTotal: 0,
    maintenanceTotal: 0,
    purchaseInvoiceCount: 0,
    purchaseInvoiceTotal: 0,
    unpaidInvoices: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [expiryWarnings, setExpiryWarnings] = useState<ExpiryWarning[]>([]);

  useEffect(() => {
    let loadCount = 0;
    const checkLoaded = () => {
      loadCount++;
      if (loadCount >= 5) setLoading(false);
    };

    // Masrafları dinle
    const unsubExpenses = subscribeToData('expenses', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, e]: [string, any]) => ({ id, ...e }));
        const total = list.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        setStats(prev => ({ ...prev, expenseCount: list.length, expenseTotal: total }));

        // Son 5 masraf
        const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentExpenses(sorted.slice(0, 5));
      }
      checkLoaded();
    });

    // Araçları dinle
    const unsubVehicles = subscribeToData('vehicles', (data) => {
      if (data) {
        const list = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
        setStats(prev => ({ ...prev, vehicleCount: list.length }));

        // Yaklaşan bitiş tarihleri
        const warnings: ExpiryWarning[] = [];
        const now = new Date();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        list.forEach((v: any) => {
          if (v.insuranceExpiry) {
            const expiry = new Date(v.insuranceExpiry);
            if (expiry.getTime() - now.getTime() < thirtyDays && expiry.getTime() > now.getTime()) {
              warnings.push({ plate: v.plate, type: 'Sigorta', date: v.insuranceExpiry });
            }
          }
          if (v.kaskoExpiry) {
            const expiry = new Date(v.kaskoExpiry);
            if (expiry.getTime() - now.getTime() < thirtyDays && expiry.getTime() > now.getTime()) {
              warnings.push({ plate: v.plate, type: 'Kasko', date: v.kaskoExpiry });
            }
          }
        });
        setExpiryWarnings(warnings);
      }
      checkLoaded();
    });

    // Yakıt ve bakım
    const unsubFuel = subscribeToData('vehicle_fuel', (data) => {
      if (data) {
        const list = Object.values(data) as any[];
        const total = list.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
        setStats(prev => ({ ...prev, fuelTotal: total }));
      }
      checkLoaded();
    });

    const unsubMaintenance = subscribeToData('vehicle_maintenance', (data) => {
      if (data) {
        const list = Object.values(data) as any[];
        const total = list.reduce((sum, m) => sum + (m.cost || 0), 0);
        setStats(prev => ({ ...prev, maintenanceTotal: total }));
      }
      checkLoaded();
    });

    // Alış faturaları
    const unsubInvoices = subscribeToData('purchase_invoices', (data) => {
      if (data) {
        const list = Object.values(data) as any[];
        const total = list.reduce((sum, i) => sum + (i.total || 0), 0);
        const unpaid = list.filter((i) => i.paymentStatus === 'unpaid').length;
        setStats(prev => ({
          ...prev,
          purchaseInvoiceCount: list.length,
          purchaseInvoiceTotal: total,
          unpaidInvoices: unpaid
        }));
      }
      checkLoaded();
    });

    return () => {
      unsubExpenses();
      unsubVehicles();
      unsubFuel();
      unsubMaintenance();
      unsubInvoices();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Veriler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Hoş geldiniz! İşte güncel özet.
        </p>
      </div>

      {/* Expiry Warnings */}
      {expiryWarnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Yaklaşan Bitiş Tarihleri</h4>
                <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                  {expiryWarnings.map((w, i) => (
                    <li key={i}>
                      <span className="font-medium">{w.plate}</span> - {w.type}: {formatDate(w.date)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Masraf Fişleri
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-100">
              <Receipt className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expenseCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toplam: {formatCurrency(stats.expenseTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Araçlar
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-100">
              <Car className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vehicleCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Kayıtlı araç
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yakıt Gideri
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-100">
              <Fuel className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.fuelTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toplam yakıt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bakım Gideri
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-100">
              <Wrench className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.maintenanceTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toplam bakım
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Purchase Invoices Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alış Faturaları
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.purchaseInvoiceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toplam: {formatCurrency(stats.purchaseInvoiceTotal)}
            </p>
            {stats.unpaidInvoices > 0 && (
              <p className="text-xs text-red-600 mt-1">
                {stats.unpaidInvoices} adet ödenmemiş fatura
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Son Masraflar</CardTitle>
            <CardDescription>En son eklenen masraf fişleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henüz masraf fişi yok
                </p>
              ) : (
                recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{expense.vendor || 'Bilinmeyen'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(expense.totalAmount || 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
