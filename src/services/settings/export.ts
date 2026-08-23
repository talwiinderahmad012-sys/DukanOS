import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from '../audit';

export async function exportBusinessData(
  businessId: string,
  userId: string,
  options: {
    format?: 'JSON' | 'CSV';
    modules?: string[];
  } = {}
) {
  const format = options.format || 'JSON';
  const modules = options.modules || [
    'products',
    'customers',
    'suppliers',
    'sales',
    'purchases',
    'expenses',
    'feedbacks',
  ];

  const exportPayload: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    businessId,
  };

  const queries: Promise<void>[] = [];

  if (modules.includes('products')) {
    queries.push(
      prisma.product
        .findMany({
          where: { businessId, isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            purchasePrice: true,
            sellingPrice: true,
            currentStock: true,
            minStockThreshold: true,
            unit: true,
            createdAt: true,
          },
        })
        .then((data) => {
          exportPayload.products = data.map((p) => ({
            ...p,
            purchasePrice: Number(p.purchasePrice),
            sellingPrice: Number(p.sellingPrice),
          }));
        })
    );
  }

  if (modules.includes('customers')) {
    queries.push(
      prisma.customer
        .findMany({
          where: { businessId, isActive: true },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            outstanding: true,
            createdAt: true,
          },
        })
        .then((data) => {
          exportPayload.customers = data.map((c) => ({
            ...c,
            outstanding: Number(c.outstanding),
          }));
        })
    );
  }

  if (modules.includes('suppliers')) {
    queries.push(
      prisma.supplier
        .findMany({
          where: { businessId, isActive: true },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            notes: true,
            createdAt: true,
          },
        })
        .then((data) => {
          exportPayload.suppliers = data;
        })
    );
  }

  if (modules.includes('sales')) {
    queries.push(
      prisma.sale
        .findMany({
          where: { businessId, status: 'COMPLETED' },
          select: {
            id: true,
            invoiceNumber: true,
            saleDate: true,
            subtotal: true,
            discount: true,
            total: true,
            paidAmount: true,
            paymentMethod: true,
            status: true,
            createdAt: true,
          },
          orderBy: { saleDate: 'desc' },
          take: 5000,
        })
        .then((data) => {
          exportPayload.sales = data.map((s) => ({
            ...s,
            subtotal: Number(s.subtotal),
            discount: Number(s.discount),
            total: Number(s.total),
            paidAmount: Number(s.paidAmount),
          }));
        })
    );
  }

  if (modules.includes('purchases')) {
    queries.push(
      prisma.purchase
        .findMany({
          where: { businessId },
          select: {
            id: true,
            invoiceNumber: true,
            purchaseDate: true,
            subtotal: true,
            total: true,
            paidAmount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { purchaseDate: 'desc' },
          take: 5000,
        })
        .then((data) => {
          exportPayload.purchases = data.map((p) => ({
            ...p,
            subtotal: Number(p.subtotal),
            total: Number(p.total),
            paidAmount: Number(p.paidAmount),
          }));
        })
    );
  }

  if (modules.includes('expenses')) {
    queries.push(
      prisma.expense
        .findMany({
          where: { businessId },
          select: {
            id: true,
            category: true,
            amount: true,
            description: true,
            date: true,
            createdAt: true,
          },
          orderBy: { date: 'desc' },
          take: 5000,
        })
        .then((data) => {
          exportPayload.expenses = data.map((e) => ({
            ...e,
            amount: Number(e.amount),
          }));
        })
    );
  }

  if (modules.includes('feedbacks')) {
    queries.push(
      prisma.customerFeedback
        .findMany({
          where: { businessId },
          select: {
            id: true,
            rating: true,
            message: true,
            category: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        })
        .then((data) => {
          exportPayload.feedbacks = data;
        })
    );
  }

  await Promise.all(queries);

  await recordAuditLog({
    businessId,
    userId,
    action: 'DATA_EXPORT_GENERATED',
    entityType: 'BusinessData',
    entityId: businessId,
    metadata: { format, modulesCount: modules.length },
  });

  if (format === 'JSON') {
    return {
      format: 'JSON',
      data: JSON.stringify(exportPayload, null, 2),
      filename: `dukaanos_export_${businessId.slice(0, 8)}_${Date.now()}.json`,
    };
  }

  // Convert key modules to simple CSV format
  const csvChunks: string[] = [];
  for (const [key, rows] of Object.entries(exportPayload)) {
    if (Array.isArray(rows) && rows.length > 0) {
      csvChunks.push(`--- MODULE: ${key.toUpperCase()} ---`);
      const headers = Object.keys(rows[0]);
      csvChunks.push(headers.join(','));
      for (const row of rows) {
        const line = headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',');
        csvChunks.push(line);
      }
      csvChunks.push('\n');
    }
  }

  return {
    format: 'CSV',
    data: csvChunks.join('\n'),
    filename: `dukaanos_export_${businessId.slice(0, 8)}_${Date.now()}.csv`,
  };
}
