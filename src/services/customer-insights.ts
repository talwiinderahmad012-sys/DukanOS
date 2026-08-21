import 'server-only';
import { prisma } from '@/lib/db/prisma';

export type TopPurchasedProduct = {
  productId: string;
  name: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
  totalSpend: number;
};

export type CustomerInsights = {
  totalPurchases: number;
  totalSpent: number;
  outstanding: number;
  averageOrderValue: number;
  firstPurchaseDate: Date | null;
  lastPurchaseDate: Date | null;
  daysActive: number;
  purchaseFrequencyDays: number | null; // Avg days between purchases (null if < 2 purchases)
  topProducts: TopPurchasedProduct[];
  feedbackCount: number;
  averageRating: number | null;
};

export async function getCustomerInsights(
  businessId: string,
  customerId: string
): Promise<CustomerInsights> {
  const [customer, completedSales, feedbacks] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId, businessId },
      select: { outstanding: true, createdAt: true },
    }),
    prisma.sale.findMany({
      where: {
        businessId,
        customerId,
        status: 'COMPLETED',
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.customerFeedback.findMany({
      where: { businessId, customerId },
      select: { rating: true },
    }),
  ]);

  if (!customer) {
    throw new Error('Customer not found');
  }

  const totalPurchases = completedSales.length;
  const totalSpent = completedSales.reduce((acc, s) => acc + Number(s.total), 0);
  const averageOrderValue = totalPurchases > 0 ? Math.round((totalSpent / totalPurchases) * 100) / 100 : 0;

  const firstPurchaseDate = completedSales[0]?.saleDate || null;
  const lastPurchaseDate = completedSales[completedSales.length - 1]?.saleDate || null;

  // Calculate Days Active & Purchase Frequency
  let daysActive = 0;
  let purchaseFrequencyDays: number | null = null;

  if (firstPurchaseDate && lastPurchaseDate) {
    const diffTime = Math.abs(lastPurchaseDate.getTime() - firstPurchaseDate.getTime());
    daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalPurchases >= 2 && daysActive > 0) {
      purchaseFrequencyDays = Math.round((daysActive / (totalPurchases - 1)) * 10) / 10;
    }
  }

  // Aggregate Most Purchased Products (strictly from completed sales)
  const productMap = new Map<
    string,
    {
      productId: string;
      name: string;
      unit: string;
      totalQuantity: number;
      orderCount: number;
      totalSpend: number;
    }
  >();

  for (const sale of completedSales) {
    const seenInThisSale = new Set<string>();
    for (const item of sale.items) {
      const existing = productMap.get(item.productId) || {
        productId: item.productId,
        name: item.product.name,
        unit: item.product.unit,
        totalQuantity: 0,
        orderCount: 0,
        totalSpend: 0,
      };

      existing.totalQuantity += item.quantity;
      existing.totalSpend += Number(item.lineTotal);

      if (!seenInThisSale.has(item.productId)) {
        existing.orderCount += 1;
        seenInThisSale.add(item.productId);
      }

      productMap.set(item.productId, existing);
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity || b.totalSpend - a.totalSpend)
    .slice(0, 5);

  // Customer Feedback summary
  const feedbackCount = feedbacks.length;
  const averageRating =
    feedbackCount > 0
      ? Math.round((feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbackCount) * 10) / 10
      : null;

  return {
    totalPurchases,
    totalSpent,
    outstanding: Number(customer.outstanding),
    averageOrderValue,
    firstPurchaseDate,
    lastPurchaseDate,
    daysActive,
    purchaseFrequencyDays,
    topProducts,
    feedbackCount,
    averageRating,
  };
}
