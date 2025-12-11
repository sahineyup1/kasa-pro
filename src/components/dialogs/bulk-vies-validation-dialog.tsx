'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { updateData } from '@/services/firebase';
import { validateVATNumber } from '@/lib/vies';
import {
  Shield, Loader2, CheckCircle, XCircle, Clock, SkipForward, Play, Square
} from 'lucide-react';

// =================== INTERFACES ===================

interface Entity {
  id: string;
  basic?: {
    name?: string;
    vatNumber?: string;
    vatValidated?: boolean;
    vatCheckedAt?: string;
  };
  tax?: {
    taxId?: string;
    vies_validated?: boolean;
    vies_validation_date?: string;
  };
  name?: string;
  vatNumber?: string;
  taxId?: string;
}

interface ValidationResult {
  entityId: string;
  entityName: string;
  vatNumber: string;
  valid: boolean;
  countryCode?: string;
  companyName?: string;
  companyAddress?: string;
  error?: string;
  validatedAt: string;
}

// =================== VIES API VALIDATION ===================

// =================== STATUS BADGE ===================

function StatusBadge({ status }: { status: 'pending' | 'validating' | 'valid' | 'invalid' | 'skipped' }) {
  const config = {
    pending: { icon: Clock, label: 'Bekliyor', class: 'text-gray-500' },
    validating: { icon: Loader2, label: 'Dogrulaniyor', class: 'text-amber-500' },
    valid: { icon: CheckCircle, label: 'Gecerli', class: 'text-green-500' },
    invalid: { icon: XCircle, label: 'Gecersiz', class: 'text-red-500' },
    skipped: { icon: SkipForward, label: 'Atlandi', class: 'text-gray-400' },
  };

  const { icon: Icon, label, class: className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
      <Icon className={`h-3 w-3 ${status === 'validating' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

// =================== MAIN COMPONENT ===================

interface BulkVIESValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'customer' | 'supplier';
  entities: Entity[];
  onComplete?: () => void;
}

export function BulkVIESValidationDialog({
  open,
  onOpenChange,
  entityType,
  entities,
  onComplete,
}: BulkVIESValidationDialogProps) {
  const [onlyExpired, setOnlyExpired] = useState(true);
  const [onlyWithVat, setOnlyWithVat] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<string, ValidationResult>>({});
  const [statuses, setStatuses] = useState<Record<string, 'pending' | 'validating' | 'valid' | 'invalid' | 'skipped'>>({});

  // Helper functions
  const getVatNumber = (entity: Entity): string => {
    return entity.basic?.vatNumber || entity.tax?.taxId || entity.vatNumber || entity.taxId || '';
  };

  const getName = (entity: Entity): string => {
    return entity.basic?.name || entity.name || '-';
  };

  const getLastValidation = (entity: Entity): string | null => {
    return entity.basic?.vatCheckedAt || entity.tax?.vies_validation_date || null;
  };

  const isExpired = (entity: Entity): boolean => {
    const lastValidation = getLastValidation(entity);
    if (!lastValidation) return true;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(lastValidation) < sixMonthsAgo;
  };

  // Filter entities based on options
  const filteredEntities = entities.filter(entity => {
    const vatNumber = getVatNumber(entity);

    if (onlyWithVat && !vatNumber) return false;
    if (onlyExpired && !isExpired(entity)) return false;

    return true;
  });

  // Initialize statuses
  useEffect(() => {
    if (open) {
      const initialStatuses: Record<string, 'pending' | 'validating' | 'valid' | 'invalid' | 'skipped'> = {};
      filteredEntities.forEach(entity => {
        const vatNumber = getVatNumber(entity);
        initialStatuses[entity.id] = vatNumber ? 'pending' : 'skipped';
      });
      setStatuses(initialStatuses);
      setResults({});
      setCurrentIndex(0);
      setIsRunning(false);
      setShouldStop(false);
    }
  }, [open, onlyExpired, onlyWithVat]);

  // Validation worker
  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setShouldStop(false);

    for (let i = 0; i < filteredEntities.length; i++) {
      if (shouldStop) break;

      const entity = filteredEntities[i];
      const vatNumber = getVatNumber(entity);

      if (!vatNumber) {
        setStatuses(prev => ({ ...prev, [entity.id]: 'skipped' }));
        setCurrentIndex(i + 1);
        continue;
      }

      // Update status to validating
      setStatuses(prev => ({ ...prev, [entity.id]: 'validating' }));
      setCurrentIndex(i);

      // Validate
      const result = await validateVATNumber(vatNumber);
      const timestamp = new Date().toISOString();

      const validationResult: ValidationResult = {
        entityId: entity.id,
        entityName: getName(entity),
        vatNumber,
        valid: result.valid,
        countryCode: result.countryCode,
        companyName: result.companyName,
        companyAddress: result.companyAddress,
        error: result.error,
        validatedAt: timestamp,
      };

      setResults(prev => ({ ...prev, [entity.id]: validationResult }));
      setStatuses(prev => ({ ...prev, [entity.id]: result.valid ? 'valid' : 'invalid' }));

      // Save to Firebase
      try {
        const path = entityType === 'customer' ? 'customers' : 'suppliers';

        if (entityType === 'customer') {
          await updateData(`${path}/${entity.id}`, {
            'basic/vatValidated': result.valid,
            'basic/vatCheckedAt': timestamp,
            'basic/vatCountry': result.countryCode || '',
            'basic/vatCompanyName': result.companyName || '',
          });
        } else {
          await updateData(`${path}/${entity.id}`, {
            'tax/vies_validated': result.valid,
            'tax/vies_validation_date': timestamp,
            'tax/vies_status': result.valid ? 'valid' : 'invalid',
            'tax/vies_country_code': result.countryCode || '',
            'tax/vies_company_name': result.companyName || '',
            'tax/vies_company_address': result.companyAddress || '',
            'tax/vies_error': result.error || '',
          });
        }
      } catch (error) {
        console.error('Save error:', error);
      }

      // API throttling - 200ms delay
      await new Promise(resolve => setTimeout(resolve, 200));
      setCurrentIndex(i + 1);
    }

    setIsRunning(false);
    onComplete?.();
  }, [filteredEntities, entityType, shouldStop, onComplete]);

  // Stats
  const stats = {
    total: filteredEntities.length,
    pending: Object.values(statuses).filter(s => s === 'pending').length,
    valid: Object.values(statuses).filter(s => s === 'valid').length,
    invalid: Object.values(statuses).filter(s => s === 'invalid').length,
    skipped: Object.values(statuses).filter(s => s === 'skipped').length,
  };

  const progress = filteredEntities.length > 0 ? (currentIndex / filteredEntities.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Toplu VIES VAT Dogrulama
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Options */}
          <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={onlyExpired}
                onCheckedChange={(checked) => setOnlyExpired(!!checked)}
                disabled={isRunning}
              />
              <span className="text-sm">Sadece 6+ ay once dogrulanmis</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={onlyWithVat}
                onCheckedChange={(checked) => setOnlyWithVat(!!checked)}
                disabled={isRunning}
              />
              <span className="text-sm">Sadece VAT numarasi olanlar</span>
            </label>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Dogrulaniyor: {currentIndex} / {filteredEntities.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="p-3 bg-gray-100 rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Toplam</div>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-amber-600">Bekliyor</div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
              <div className="text-xs text-green-600">Gecerli</div>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
              <div className="text-xs text-red-600">Gecersiz</div>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <div className="text-2xl font-bold text-gray-500">{stats.skipped}</div>
              <div className="text-xs text-gray-500">Atlandi</div>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Isim</TableHead>
                  <TableHead>VAT Numarasi</TableHead>
                  <TableHead>Son Dogrulama</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Ulke</TableHead>
                  <TableHead>Sonuc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Dogrulanacak kayit bulunamadi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => {
                    const vatNumber = getVatNumber(entity);
                    const lastValidation = getLastValidation(entity);
                    const status = statuses[entity.id] || 'pending';
                    const result = results[entity.id];

                    return (
                      <TableRow key={entity.id}>
                        <TableCell className="font-medium">{getName(entity)}</TableCell>
                        <TableCell className="font-mono text-sm">{vatNumber || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {lastValidation
                            ? new Date(lastValidation).toLocaleDateString('tr-TR')
                            : '-'}
                        </TableCell>
                        <TableCell><StatusBadge status={status} /></TableCell>
                        <TableCell className="text-sm">
                          {result?.countryCode || vatNumber?.substring(0, 2) || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {result?.companyName || result?.error || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
            <div className="flex gap-2">
              {isRunning ? (
                <Button variant="destructive" onClick={() => setShouldStop(true)}>
                  <Square className="h-4 w-4 mr-2" />
                  Durdur
                </Button>
              ) : (
                <Button onClick={runValidation} disabled={filteredEntities.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Dogrulamayi Baslat ({filteredEntities.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
