import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { notFound, redirect } from 'next/navigation';
import { movementReferenceHref } from '@/components/inventory/stock-helpers';
import {
  ProductDetailClient,
  type MovementRow,
  type ProductDetailData,
} from './product-detail-client';

export default async function InventoryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership, business } = await getActiveBusiness().catch(() => redirect('/login'));
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id, businessId: business.id },
    include: {
      category: { select: { name: true } },
      movements: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const creatorIds = [
    ...new Set(product.movements.map((m) => m.createdBy).filter((creatorId): creatorId is string => Boolean(creatorId))),
  ];
  const creators =
    creatorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : [];
  const creatorNames = new Map(creators.map((u) => [u.id, u.name ?? '']));

  const detail: ProductDetailData = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    categoryName: product.category?.name ?? null,
    currentStock: product.currentStock,
    minStockThreshold: product.minStockThreshold,
    sellingPrice: Number(product.sellingPrice),
    purchasePrice: Number(product.purchasePrice),
  };

  const movements: MovementRow[] = product.movements.map((movement) => ({
    id: movement.id,
    createdAt: movement.createdAt.toISOString(),
    movementType: movement.movementType,
    quantity: movement.quantity,
    previousStock: movement.previousStock,
    resultingStock: movement.resultingStock,
    notes: movement.notes,
    creatorName: movement.createdBy ? creatorNames.get(movement.createdBy) ?? null : null,
    referenceHref: movementReferenceHref(movement.movementType, movement.notes, movement.referenceId),
  }));

  return (
    <ProductDetailClient
      businessId={business.id}
      canManage={canManage}
      product={detail}
      movements={movements}
    />
  );
}
