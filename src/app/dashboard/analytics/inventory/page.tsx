import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getInventoryValuation,
  getLowStockSummary,
  getSlowMovingProducts,
  getDeadStock,
} from '@/services/analytics';
import { InventoryAnalyticsClient } from './inventory-analytics-client';

export default async function InventoryAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  await searchParams;

  const [inventory, lowStock, slowMoving, deadStock] = await Promise.all([
    getInventoryValuation(business.id),
    getLowStockSummary(business.id),
    getSlowMovingProducts(business.id, 30, 20),
    getDeadStock(business.id, 90, 20),
  ]);

  return (
    <InventoryAnalyticsClient
      inventory={{
        totalUnits: inventory.totalUnits,
        totalValue: inventory.totalValue,
        lowStockValue: inventory.lowStockValue,
        deadStockValue: inventory.deadStockValue,
        valuationMethod: inventory.valuationMethod,
      }}
      lowStock={lowStock}
      slowMoving={slowMoving.map(p => ({
        productId: p.productId,
        name: p.name,
        currentStock: p.currentStock,
        stockValue: p.stockValue,
        daysSinceLastSale: p.daysSinceLastSale,
      }))}
      deadStock={deadStock.map(p => ({
        productId: p.productId,
        name: p.name,
        currentStock: p.currentStock,
        inventoryValue: p.inventoryValue,
        daysSinceLastSale: p.daysSinceLastSale,
      }))}
    />
  );
}
