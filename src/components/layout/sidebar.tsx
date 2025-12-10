'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Star,
  Clock,
  Search,
  PanelLeftClose,
  PanelLeft,
  Building2,
  Command,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  menuGroups,
  hasScreenAccess,
  hasAnyChildAccess,
  type MenuItem,
  type MenuGroup,
} from '@/config/menu-config';

// LocalStorage keys
const STORAGE_KEYS = {
  COLLAPSED_GROUPS: 'sidebar-collapsed-groups',
  FAVORITES: 'sidebar-favorites',
  RECENT: 'sidebar-recent',
  SIDEBAR_COLLAPSED: 'sidebar-collapsed',
};

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // State
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentPages, setRecentPages] = useState<{ id: string; title: string; href: string }[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Kullanıcı rolü - Python ERP ile aynı mantık
  const userRole = user?.role || 'admin';
  const allowedScreens = (user as any)?.allowedScreens;

  // LocalStorage'dan state yükle
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(STORAGE_KEYS.COLLAPSED_GROUPS);
      const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      const savedRecent = localStorage.getItem(STORAGE_KEYS.RECENT);
      const savedSidebarCollapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);

      if (savedCollapsed) {
        setCollapsedGroups(JSON.parse(savedCollapsed));
      } else {
        // Varsayılan: sadece ana menü ve satış/finans açık
        const defaults: Record<string, boolean> = {};
        menuGroups.forEach(group => {
          defaults[group.id] = !group.defaultOpen;
        });
        setCollapsedGroups(defaults);
      }

      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedRecent) setRecentPages(JSON.parse(savedRecent));
      if (savedSidebarCollapsed) setSidebarCollapsed(JSON.parse(savedSidebarCollapsed));
    } catch (e) {
      console.error('LocalStorage load error:', e);
    }
  }, []);

  // Recent pages güncelle
  useEffect(() => {
    if (pathname && pathname !== '/dashboard') {
      // Mevcut sayfayı bul
      let currentPage: { id: string; title: string; href: string } | null = null;

      menuGroups.forEach(group => {
        group.items.forEach(item => {
          if (item.href === pathname) {
            currentPage = { id: item.id, title: item.title, href: item.href };
          }
          if (item.children) {
            item.children.forEach(child => {
              if (child.href === pathname) {
                currentPage = { id: child.id, title: child.title, href: child.href! };
              }
            });
          }
        });
      });

      if (currentPage) {
        setRecentPages(prev => {
          const filtered = prev.filter(p => p.id !== currentPage!.id);
          const updated = [currentPage!, ...filtered].slice(0, 5);
          localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
          return updated;
        });
      }
    }
  }, [pathname]);

  // Grup aç/kapa
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const updated = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem(STORAGE_KEYS.COLLAPSED_GROUPS, JSON.stringify(updated));
      return updated;
    });
  };

  // Alt menü aç/kapa
  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Favori ekle/çıkar
  const toggleFavorite = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
      return updated;
    });
  };

  // Sidebar aç/kapa (desktop only)
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(!prev));
      return !prev;
    });
  };

  // Çıkış yap
  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Aktif sayfa kontrolü
  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/dashboard') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Menü öğesi tıklama - mobilde menüyü kapat
  const handleMenuClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // Menü öğesi render
  const renderMenuItem = (item: MenuItem, depth = 0) => {
    // Erişim kontrolü - Python ERP ile aynı
    if (!hasAnyChildAccess(item, userRole, allowedScreens)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.id];
    const active = isActive(item.href);
    const isFavorite = favorites.includes(item.id);
    const Icon = item.icon;

    // Collapsed sidebar için sadece icon (desktop only)
    if (sidebarCollapsed && depth === 0 && !mobileOpen) {
      return (
        <div key={item.id} className="relative group">
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors mx-auto',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={item.title}
              onClick={handleMenuClick}
            >
              <Icon className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={() => toggleItem(item.id)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors mx-auto',
                'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={item.title}
            >
              <Icon className="h-5 w-5" />
            </button>
          )}

          {/* Hover tooltip */}
          <div className="absolute left-full ml-2 top-0 hidden group-hover:block z-50">
            <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg py-2 px-3 whitespace-nowrap">
              <span className="font-medium">{item.title}</span>
              {hasChildren && (
                <div className="mt-2 space-y-1">
                  {item.children!.map(child => (
                    <Link
                      key={child.id}
                      href={child.href!}
                      className="block text-sm text-muted-foreground hover:text-foreground py-1"
                      onClick={handleMenuClick}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={item.id}>
        {item.href && !hasChildren ? (
          <Link
            href={item.href}
            onClick={handleMenuClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              depth > 0 && 'ml-6 text-[13px]'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge && (
              <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
            <button
              onClick={(e) => toggleFavorite(item.id, e)}
              className={cn(
                'opacity-0 group-hover:opacity-100 transition-opacity',
                isFavorite && 'opacity-100'
              )}
            >
              <Star
                className={cn(
                  'h-3.5 w-3.5',
                  isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                )}
              />
            </button>
          </Link>
        ) : (
          <>
            <button
              onClick={() => toggleItem(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all w-full',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                depth > 0 && 'ml-6'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">{item.title}</span>
              {hasChildren && (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              )}
            </button>
            {hasChildren && isExpanded && (
              <div className="mt-1 space-y-1">
                {item.children!.map(child => renderMenuItem(child, depth + 1))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Favori öğelerini bul
  const favoriteItems = favorites
    .map(favId => {
      for (const group of menuGroups) {
        for (const item of group.items) {
          if (item.id === favId) return item;
          if (item.children) {
            const child = item.children.find(c => c.id === favId);
            if (child) return child;
          }
        }
      }
      return null;
    })
    .filter(Boolean) as MenuItem[];

  // Desktop collapsed veya mobil açık mı
  const isCollapsedDesktop = sidebarCollapsed && !mobileOpen;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        // Desktop: normal davranış
        'hidden lg:block',
        isCollapsedDesktop ? 'lg:w-16' : 'lg:w-64',
        // Mobile: overlay olarak göster
        mobileOpen && 'block w-72 lg:hidden shadow-xl'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={cn(
          'flex h-16 items-center border-b',
          isCollapsedDesktop ? 'justify-center px-2' : 'justify-between px-4'
        )}>
          {(!isCollapsedDesktop || mobileOpen) && (
            <Link href="/dashboard" className="flex items-center gap-2" onClick={handleMenuClick}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Atlas ERP</span>
            </Link>
          )}

          {/* Desktop: toggle button */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:block p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>

          {/* Mobile: close button */}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search - sadece açık sidebar'da */}
        {(!isCollapsedDesktop || mobileOpen) && (
          <div className="px-3 py-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Ara...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-background border rounded">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {/* Favoriler */}
          {(!isCollapsedDesktop || mobileOpen) && favoriteItems.length > 0 && (
            <div className="mb-4">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                Favoriler
              </p>
              <div className="space-y-1">
                {favoriteItems.map(item => (
                  <Link
                    key={item.id}
                    href={item.href!}
                    onClick={handleMenuClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </div>
              <div className="my-3 border-t" />
            </div>
          )}

          {/* Menü Grupları */}
          {menuGroups.map(group => {
            // Gruptaki erişilebilir öğeler
            const accessibleItems = group.items.filter(item =>
              hasAnyChildAccess(item, userRole, allowedScreens)
            );

            if (accessibleItems.length === 0) return null;

            const isGroupCollapsed = collapsedGroups[group.id];

            if (isCollapsedDesktop && !mobileOpen) {
              // Collapsed modda sadece iconlar
              return (
                <div key={group.id} className="mb-4 space-y-2">
                  {accessibleItems.map(item => renderMenuItem(item))}
                </div>
              );
            }

            return (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {isGroupCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {group.title}
                </button>
                {!isGroupCollapsed && (
                  <div className="mt-1 space-y-1">
                    {accessibleItems.map(item => renderMenuItem(item))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Son Ziyaretler */}
          {(!isCollapsedDesktop || mobileOpen) && recentPages.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Son Ziyaretler
              </p>
              <div className="space-y-1">
                {recentPages.slice(0, 3).map(page => (
                  <Link
                    key={page.id}
                    href={page.href}
                    onClick={handleMenuClick}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <span className="truncate">{page.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Info */}
        <div className="border-t p-3">
          {isCollapsedDesktop && !mobileOpen ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName || 'Kullanıcı'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.branchName || 'Şube'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
