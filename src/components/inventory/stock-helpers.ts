import type { MovementType } from '@/generated/prisma/client';
import type { BadgeTone } from '@/components/ui/badge';

export type StockLite = { currentStock: number; minStockThreshold: number };

export type StockFilter = 'ALL' | 'IN' | 'LOW' | 'OUT';

export function isOutOfStock(p: StockLite): boolean {
  return p.currentStock <= 0;
}

export function isLowStock(p: StockLite): boolean {
  return p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
}

export function stockDisplay(p: StockLite): { label: string; tone: BadgeTone } {
  if (isOutOfStock(p)) return { label: 'Out of Stock', tone: 'danger' };
  if (isLowStock(p)) return { label: 'Low Stock', tone: 'warning' };
  return { label: 'In Stock', tone: 'success' };
}

const MOVEMENT_LABELS: Record<MovementType, { label: string; tone: BadgeTone }> = {
  OPENING: { label: 'Opening Stock', tone: 'neutral' },
  PURCHASE: { label: 'Purchase', tone: 'info' },
  SALE: { label: 'Sale', tone: 'primary' },
  RETURN: { label: 'Return', tone: 'warning' },
  ADJUSTMENT: { label: 'Adjustment', tone: 'success' },
  DAMAGE: { label: 'Damage', tone: 'danger' },
  LOSS: { label: 'Loss', tone: 'danger' },
  TRANSFER: { label: 'Transfer', tone: 'neutral' },
};

export function movementDisplay(type: MovementType, notes: string | null): {
  label: string;
  tone: BadgeTone;
} {
  if (type === 'RETURN' && notes) {
    if (notes.startsWith('Cancelled Sale')) return { label: 'Sale Cancellation', tone: 'success' };
    if (notes.startsWith('Cancelled Purchase')) return { label: 'Purchase Cancellation', tone: 'danger' };
  }
  return MOVEMENT_LABELS[type];
}

export function movementReferenceHref(
  type: MovementType,
  notes: string | null,
  referenceId: string | null,
): string | null {
  if (!referenceId) return null;
  if (type === 'PURCHASE') return `/dashboard/purchases/${referenceId}`;
  if (type === 'SALE') return `/dashboard/sales/${referenceId}`;
  if (type === 'RETURN' && notes) {
    if (notes.startsWith('Cancelled Sale')) return `/dashboard/sales/${referenceId}`;
    if (notes.startsWith('Cancelled Purchase')) return `/dashboard/purchases/${referenceId}`;
  }
  return null;
}
