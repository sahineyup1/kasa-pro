'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// =================== TYPES ===================

export interface Column<T> {
  key: string;
  header: string;
  // Desktop tablo hücresi render
  render?: (item: T) => ReactNode;
  // Mobil kart'ta göster
  showInCard?: boolean;
  // Mobil kart'ta ana başlık olarak kullan
  isTitle?: boolean;
  // Mobil kart'ta alt başlık olarak kullan
  isSubtitle?: boolean;
  // Mobil kart'ta badge olarak göster
  isBadge?: boolean;
  // Desktop'ta gizle (sadece mobilde göster)
  hideOnDesktop?: boolean;
  // Mobilde gizle (sadece desktop'ta göster)
  hideOnMobile?: boolean;
  // Sağa hizala
  alignRight?: boolean;
  // Genişlik (desktop)
  width?: string;
}

export interface Action<T> {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  onRowClick?: (item: T) => void;
  onRowDoubleClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  keyField?: string;
  className?: string;
}

// =================== LOADING SKELETON ===================

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden lg:block">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b animate-pulse">
            {[...Array(columns)].map((_, j) => (
              <div key={j} className="flex-1 h-4 bg-gray-200 rounded" />
            ))}
          </div>
        ))}
      </div>
      {/* Mobile Skeleton */}
      <div className="lg:hidden space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-16" />
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =================== EMPTY STATE ===================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-500">
      <p>{message}</p>
    </div>
  );
}

// =================== DESKTOP TABLE ROW ===================

function DesktopTableRow<T>({
  item,
  columns,
  actions,
  onRowClick,
  onRowDoubleClick,
}: {
  item: T;
  columns: Column<T>[];
  actions?: Action<T>[];
  onRowClick?: (item: T) => void;
  onRowDoubleClick?: (item: T) => void;
}) {
  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-muted/50',
        (onRowClick || onRowDoubleClick) && 'cursor-pointer'
      )}
      onClick={() => onRowClick?.(item)}
      onDoubleClick={() => onRowDoubleClick?.(item)}
    >
      {columns
        .filter(col => !col.hideOnDesktop)
        .map(col => (
          <td
            key={col.key}
            className={cn(
              'px-4 py-3 text-sm',
              col.alignRight && 'text-right'
            )}
            style={col.width ? { width: col.width } : undefined}
          >
            {col.render ? col.render(item) : String((item as any)[col.key] ?? '-')}
          </td>
        ))}
      {actions && actions.length > 0 && (
        <td className="px-4 py-3 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, index) => (
                <div key={index}>
                  {action.separator && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(item);
                    }}
                    className={cn(
                      action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                    )}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  );
}

// =================== MOBILE CARD ===================

function MobileCard<T>({
  item,
  columns,
  actions,
  onRowClick,
  onRowDoubleClick,
}: {
  item: T;
  columns: Column<T>[];
  actions?: Action<T>[];
  onRowClick?: (item: T) => void;
  onRowDoubleClick?: (item: T) => void;
}) {
  const titleCol = columns.find(col => col.isTitle);
  const subtitleCol = columns.find(col => col.isSubtitle);
  const badgeCols = columns.filter(col => col.isBadge);
  const detailCols = columns.filter(
    col => col.showInCard && !col.isTitle && !col.isSubtitle && !col.isBadge && !col.hideOnMobile
  );

  return (
    <div
      className={cn(
        'bg-white rounded-lg border p-4 transition-shadow hover:shadow-md',
        (onRowClick || onRowDoubleClick) && 'cursor-pointer active:bg-gray-50'
      )}
      onClick={() => onRowClick?.(item)}
      onDoubleClick={() => onRowDoubleClick?.(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          {titleCol && (
            <h3 className="font-medium text-gray-900 truncate">
              {titleCol.render ? titleCol.render(item) : String((item as any)[titleCol.key] ?? '-')}
            </h3>
          )}
          {/* Subtitle */}
          {subtitleCol && (
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {subtitleCol.render ? subtitleCol.render(item) : String((item as any)[subtitleCol.key] ?? '-')}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 -mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, index) => (
                <div key={index}>
                  {action.separator && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(item);
                    }}
                    className={cn(
                      action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                    )}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Badges */}
      {badgeCols.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {badgeCols.map(col => (
            <div key={col.key}>
              {col.render ? col.render(item) : String((item as any)[col.key] ?? '-')}
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      {detailCols.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1.5">
          {detailCols.map(col => (
            <div key={col.key} className="flex justify-between text-sm">
              <span className="text-gray-500">{col.header}</span>
              <span className="font-medium text-gray-900">
                {col.render ? col.render(item) : String((item as any)[col.key] ?? '-')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== MAIN COMPONENT ===================

export function ResponsiveTable<T>({
  data,
  columns,
  actions,
  onRowClick,
  onRowDoubleClick,
  loading = false,
  emptyMessage = 'Veri bulunamadi',
  keyField = 'id',
  className,
}: ResponsiveTableProps<T>) {
  if (loading) {
    return <TableSkeleton columns={columns.length} />;
  }

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns
                .filter(col => !col.hideOnDesktop)
                .map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm font-medium text-gray-500 text-left',
                      col.alignRight && 'text-right'
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                ))}
              {actions && actions.length > 0 && (
                <th className="px-4 py-3 w-12" />
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <DesktopTableRow
                key={(item as any)[keyField]}
                item={item}
                columns={columns}
                actions={actions}
                onRowClick={onRowClick}
                onRowDoubleClick={onRowDoubleClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {data.map((item) => (
          <MobileCard
            key={(item as any)[keyField]}
            item={item}
            columns={columns}
            actions={actions}
            onRowClick={onRowClick}
            onRowDoubleClick={onRowDoubleClick}
          />
        ))}
      </div>
    </div>
  );
}

// =================== RESPONSIVE STATS GRID ===================

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray';
  change?: string;
  changeType?: 'up' | 'down';
}

export function ResponsiveStatsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {children}
    </div>
  );
}

export function StatCard({ title, value, icon, color = 'gray' }: StatCardProps) {
  const colorClasses = {
    blue: 'border-l-amber-500 bg-amber-50',
    green: 'border-l-green-500 bg-green-50',
    red: 'border-l-red-500 bg-red-50',
    amber: 'border-l-amber-500 bg-amber-50',
    purple: 'border-l-purple-500 bg-purple-50',
    gray: 'border-l-gray-500 bg-gray-50',
  };

  const textColors = {
    blue: 'text-amber-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
  };

  return (
    <div className={cn('rounded-lg border-l-4 p-3 lg:p-4', colorClasses[color])}>
      <div className="flex items-center justify-between mb-1 lg:mb-2">
        <span className="text-xs lg:text-sm text-gray-600 truncate">{title}</span>
        {icon && <span className="hidden sm:block">{icon}</span>}
      </div>
      <span className={cn('text-lg lg:text-2xl font-bold', textColors[color])}>
        {value}
      </span>
    </div>
  );
}

// =================== RESPONSIVE PAGE HEADER ===================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function ResponsivePageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 lg:mb-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

// =================== RESPONSIVE FILTER BAR ===================

export function ResponsiveFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {children}
    </div>
  );
}
