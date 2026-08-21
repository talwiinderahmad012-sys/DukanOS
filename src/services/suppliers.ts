import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './audit';

export async function createSupplier(businessId: string, userId: string, data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  const supplier = await prisma.supplier.create({
    data: { businessId, ...data }
  });

  await recordAuditLog({
    businessId, userId, action: 'SUPPLIER_CREATED', entityType: 'Supplier', entityId: supplier.id,
    metadata: { name: supplier.name }
  });

  return supplier;
}

export async function updateSupplier(businessId: string, userId: string, supplierId: string, data: any) {
  const supplier = await prisma.supplier.update({
    where: { id: supplierId, businessId },
    data
  });

  await recordAuditLog({
    businessId, userId, action: 'SUPPLIER_UPDATED', entityType: 'Supplier', entityId: supplier.id,
  });

  return supplier;
}

export async function archiveSupplier(businessId: string, userId: string, supplierId: string) {
  const supplier = await prisma.supplier.update({
    where: { id: supplierId, businessId },
    data: { isActive: false }
  });

  await recordAuditLog({
    businessId, userId, action: 'SUPPLIER_ARCHIVED', entityType: 'Supplier', entityId: supplier.id,
  });

  return supplier;
}

export async function getSupplierWithPurchases(businessId: string, supplierId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId, businessId },
    include: {
      purchases: {
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true }
              }
            }
          }
        },
        orderBy: { purchaseDate: 'desc' },
      }
    }
  });

  if (!supplier) return null;

  const totalPurchases = supplier.purchases.length;
  const totalSpend = supplier.purchases.reduce((acc, p) => acc + Number(p.total), 0);
  const totalPaid = supplier.purchases.reduce((acc, p) => acc + Number(p.paidAmount), 0);
  const remainingDue = Math.max(0, totalSpend - totalPaid);
  const lastPurchaseDate = supplier.purchases[0]?.purchaseDate || null;

  return {
    supplier,
    summary: {
      totalPurchases,
      totalSpend,
      totalPaid,
      remainingDue,
      lastPurchaseDate,
    },
    purchases: supplier.purchases,
  };
}
