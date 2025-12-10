/**
 * Menu Configuration - Python ERP ile birebir aynı yapı
 * Rol bazlı erişim kontrolü ve menü grupları
 */

import {
  LayoutDashboard,
  Bot,
  Calculator,
  Wallet,
  Package,
  Users,
  FileText,
  Building2,
  Receipt,
  Truck,
  ClipboardList,
  MessageSquare,
  Beef,
  BarChart3,
  FileSpreadsheet,
  Settings,
  Car,
  UserCog,
  CreditCard,
  ShoppingCart,
  Store,
  type LucideIcon,
} from 'lucide-react';

// Menu item tipi
export interface MenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
  href?: string;
  badge?: number;
  children?: MenuItem[];
}

// Menu group tipi
export interface MenuGroup {
  id: string;
  title: string;
  defaultOpen?: boolean;
  items: MenuItem[];
}

// Rol bazlı ekran erişimleri - Python ERP ile AYNI
export const roleScreenAccess: Record<string, string[]> = {
  admin: [
    'dashboard', 'ai_assistant', 'cashier', 'finance', 'products',
    'invoice_management', 'account_management', 'warehouse_management',
    'expense_management', 'logistics', 'butcher', 'reports', 'delivery_notes',
    'whatsapp_orders', 'vehicles', 'employees', 'settings', 'accountant',
    'customers', 'suppliers', 'bank'
  ],
  depo_muduru: [
    'dashboard', 'ai_assistant', 'cashier', 'finance', 'logistics', 'products',
    'account_management', 'warehouse_management', 'delivery_notes', 'vehicles'
  ],
  depo: [
    'dashboard', 'ai_assistant', 'cashier', 'finance', 'logistics', 'products',
    'account_management', 'warehouse_management', 'delivery_notes'
  ],
  finans: [
    'dashboard', 'ai_assistant', 'cashier', 'finance', 'products',
    'invoice_management', 'warehouse_management', 'expense_management',
    'reports', 'bank', 'accountant'
  ],
  kasiyer: [
    'dashboard', 'ai_assistant', 'cashier', 'finance', 'products',
    'invoice_management', 'account_management', 'warehouse_management'
  ],
  sofor: [
    'dashboard', 'finance', 'products',
    'invoice_management', 'warehouse_management', 'delivery_notes', 'vehicles'
  ],
  kasap: [
    'dashboard', 'butcher', 'logistics', 'products',
    'invoice_management', 'warehouse_management'
  ]
};

// Ana menü tanımları - Python ERP sıralaması ile AYNI
export const menuDefinitions: MenuItem[] = [
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'ai_assistant', title: 'AI Asistan', icon: Bot, href: '/dashboard/ai' },
  { id: 'cashier', title: 'Kasiyer', icon: Calculator, href: '/dashboard/cashier' },
  { id: 'finance', title: 'Finans', icon: Wallet, href: '/dashboard/finance' },
  { id: 'products', title: 'Ürünler', icon: Package, href: '/dashboard/products' },
  {
    id: 'account_management',
    title: 'Cariler',
    icon: Users,
    children: [
      { id: 'customers', title: 'Müşteriler', icon: Users, href: '/dashboard/customers' },
      { id: 'suppliers', title: 'Tedarikçiler', icon: Store, href: '/dashboard/suppliers' },
    ]
  },
  {
    id: 'invoice_management',
    title: 'Faturalar',
    icon: FileText,
    children: [
      { id: 'purchase_invoices', title: 'Alış Faturaları', icon: ShoppingCart, href: '/dashboard/purchase-invoices' },
      { id: 'sale_invoices', title: 'Satış Faturaları', icon: FileText, href: '/dashboard/sale-invoices' },
    ]
  },
  { id: 'warehouse_management', title: 'Depo', icon: Building2, href: '/dashboard/warehouse' },
  { id: 'expense_management', title: 'Giderler', icon: Receipt, href: '/dashboard/expenses' },
  { id: 'logistics', title: 'Lojistik', icon: Truck, href: '/dashboard/logistics' },
  { id: 'delivery_notes', title: 'İrsaliye', icon: ClipboardList, href: '/dashboard/delivery-notes' },
  { id: 'whatsapp_orders', title: 'WhatsApp', icon: MessageSquare, href: '/dashboard/whatsapp' },
  { id: 'butcher', title: 'Kasap', icon: Beef, href: '/dashboard/butcher' },
  { id: 'vehicles', title: 'Araçlar', icon: Car, href: '/dashboard/vehicles' },
  { id: 'employees', title: 'Çalışanlar', icon: UserCog, href: '/dashboard/employees' },
  { id: 'bank', title: 'Banka', icon: CreditCard, href: '/dashboard/bank' },
  { id: 'reports', title: 'Raporlar', icon: BarChart3, href: '/dashboard/reports' },
  { id: 'accountant', title: 'Mali Müşavir', icon: FileSpreadsheet, href: '/dashboard/accountant' },
  { id: 'settings', title: 'Ayarlar', icon: Settings, href: '/dashboard/settings' },
];

// Gruplu menü yapısı (collapsible sidebar için)
export const menuGroups: MenuGroup[] = [
  {
    id: 'main',
    title: 'Ana Menü',
    defaultOpen: true,
    items: [
      { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { id: 'ai_assistant', title: 'AI Asistan', icon: Bot, href: '/dashboard/ai' },
    ]
  },
  {
    id: 'sales_finance',
    title: 'Satış & Finans',
    defaultOpen: true,
    items: [
      { id: 'cashier', title: 'Kasiyer', icon: Calculator, href: '/dashboard/cashier' },
      { id: 'finance', title: 'Finans', icon: Wallet, href: '/dashboard/finance' },
      {
        id: 'invoice_management',
        title: 'Faturalar',
        icon: FileText,
        children: [
          { id: 'purchase_invoices', title: 'Alış Faturaları', icon: ShoppingCart, href: '/dashboard/purchase-invoices' },
          { id: 'sale_invoices', title: 'Satış Faturaları', icon: FileText, href: '/dashboard/sale-invoices' },
        ]
      },
      { id: 'expense_management', title: 'Masraflar', icon: Receipt, href: '/dashboard/expenses' },
      { id: 'bank', title: 'Banka', icon: CreditCard, href: '/dashboard/bank' },
    ]
  },
  {
    id: 'inventory',
    title: 'Stok & Depo',
    defaultOpen: false,
    items: [
      { id: 'products', title: 'Ürünler', icon: Package, href: '/dashboard/products' },
      { id: 'warehouse_management', title: 'Depo', icon: Building2, href: '/dashboard/warehouse' },
      { id: 'logistics', title: 'Lojistik', icon: Truck, href: '/dashboard/logistics' },
      { id: 'delivery_notes', title: 'İrsaliye', icon: ClipboardList, href: '/dashboard/delivery-notes' },
    ]
  },
  {
    id: 'partners',
    title: 'Cariler',
    defaultOpen: false,
    items: [
      { id: 'customers', title: 'Müşteriler', icon: Users, href: '/dashboard/customers' },
      { id: 'suppliers', title: 'Tedarikçiler', icon: Store, href: '/dashboard/suppliers' },
    ]
  },
  {
    id: 'hr',
    title: 'İnsan Kaynakları',
    defaultOpen: false,
    items: [
      { id: 'employees', title: 'Çalışanlar', icon: UserCog, href: '/dashboard/employees' },
      { id: 'vehicles', title: 'Araçlar', icon: Car, href: '/dashboard/vehicles' },
    ]
  },
  {
    id: 'operations',
    title: 'Operasyonlar',
    defaultOpen: false,
    items: [
      { id: 'butcher', title: 'Kasap', icon: Beef, href: '/dashboard/butcher' },
      { id: 'whatsapp_orders', title: 'WhatsApp', icon: MessageSquare, href: '/dashboard/whatsapp' },
    ]
  },
  {
    id: 'reports',
    title: 'Raporlar & Analiz',
    defaultOpen: false,
    items: [
      { id: 'reports', title: 'Raporlar', icon: BarChart3, href: '/dashboard/reports' },
      { id: 'accountant', title: 'Mali Müşavir', icon: FileSpreadsheet, href: '/dashboard/accountant' },
    ]
  },
];

// Ekran erişim kontrolü - Python ERP ile AYNI mantık
export function hasScreenAccess(screenKey: string, userRole: string, allowedScreens?: string[]): boolean {
  // Admin her şeye erişebilir
  if (userRole === 'admin') {
    return true;
  }

  // Kullanıcıya özel ekran listesi varsa onu kullan
  if (allowedScreens && allowedScreens.length > 0) {
    return allowedScreens.includes(screenKey);
  }

  // Rol bazlı varsayılan erişim
  const roleAccess = roleScreenAccess[userRole] || ['dashboard'];
  return roleAccess.includes(screenKey);
}

// Alt menü dahil tüm erişilebilir ekranları kontrol et
export function hasAnyChildAccess(item: MenuItem, userRole: string, allowedScreens?: string[]): boolean {
  if (item.children) {
    return item.children.some(child => hasScreenAccess(child.id, userRole, allowedScreens));
  }
  return hasScreenAccess(item.id, userRole, allowedScreens);
}
