import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { MembershipRole } from '@/generated/prisma/client';

export type ActivityCategory = 'SALES' | 'INVENTORY' | 'STAFF' | 'CUSTOMER' | 'ADMIN';

export type ActivityEvent = {
  id: string;
  category: ActivityCategory;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  actorName: string;
  linkUrl?: string;
};

export async function getBusinessActivityFeed(
  businessId: string,
  userRole: MembershipRole,
  options: {
    limit?: number;
    category?: ActivityCategory | 'ALL';
  } = {}
): Promise<ActivityEvent[]> {
  const limit = options.limit || 40;
  const isOwnerOrManager = userRole === MembershipRole.OWNER || userRole === MembershipRole.MANAGER;

  // 1. Fetch Audit Logs
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      businessId,
      // Hide salary and confidential complaint audit actions from ordinary staff
      ...(!isOwnerOrManager
        ? {
            action: {
              notIn: [
                'SALARY_RECORD_CREATED',
                'SALARY_PAID',
                'COMPLAINT_SUBMITTED',
                'COMPLAINT_RESOLVED',
              ],
            },
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const events: ActivityEvent[] = [];

  for (const log of auditLogs) {
    const actorName = log.user?.name || log.user?.email?.split('@')[0] || 'System';
    let category: ActivityCategory = 'ADMIN';
    let title = log.action.replace(/_/g, ' ');
    let description = '';
    let linkUrl: string | undefined;

    let parsedMeta: any = {};
    if (log.metadata) {
      try {
        parsedMeta = JSON.parse(log.metadata);
      } catch {}
    }

    if (log.action.startsWith('SALE_')) {
      category = 'SALES';
      title = log.action === 'SALE_CANCELLED' ? 'Sale Cancelled' : 'Sale Checkout';
      description = `Invoice #${parsedMeta.invoiceNumber || log.entityId} — Rs. ${parsedMeta.total || ''}`;
      linkUrl = `/dashboard/sales/${log.entityId}`;
    } else if (log.action.startsWith('PURCHASE_')) {
      category = 'INVENTORY';
      title = log.action === 'PURCHASE_CANCELLED' ? 'Purchase Cancelled' : 'Purchase Recorded';
      description = `Invoice #${parsedMeta.invoiceNumber || log.entityId} — Total Rs. ${parsedMeta.total || ''}`;
      linkUrl = `/dashboard/purchases/${log.entityId}`;
    } else if (log.action === 'STOCK_ADJUSTED') {
      category = 'INVENTORY';
      title = 'Inventory Stock Adjustment';
      description = `Product ${parsedMeta.productName || log.entityId} adjusted by ${parsedMeta.quantityChange > 0 ? '+' : ''}${parsedMeta.quantityChange}`;
      linkUrl = `/dashboard/inventory/${log.entityId}`;
    } else if (log.action === 'CUSTOMER_PAYMENT') {
      category = 'CUSTOMER';
      title = 'Customer Udhaar Payment';
      description = `Payment received: Rs. ${parsedMeta.amount || ''} via ${parsedMeta.method || 'CASH'}`;
      linkUrl = `/dashboard/customers/${parsedMeta.customerId || log.entityId}`;
    } else if (log.action.startsWith('CUSTOMER_')) {
      category = 'CUSTOMER';
      title = log.action === 'CUSTOMER_CREATED' ? 'New Customer Registered' : 'Customer Updated';
      description = `${parsedMeta.name || 'Customer'}`;
      linkUrl = `/dashboard/customers/${log.entityId}`;
    } else if (log.action.startsWith('LEAVE_')) {
      category = 'STAFF';
      title = `Employee Leave ${parsedMeta.status || ''}`;
      description = `Leave record ID: ${log.entityId}`;
      linkUrl = `/dashboard/employees`;
    } else if (log.action.startsWith('SALARY_')) {
      category = 'STAFF';
      title = log.action === 'SALARY_PAID' ? 'Salary Disbursed' : 'Salary Record Created';
      description = `Period ${parsedMeta.period || ''}`;
      linkUrl = `/dashboard/employees`;
    } else if (log.action.startsWith('FEEDBACK_')) {
      category = 'CUSTOMER';
      title = `Customer Feedback ${parsedMeta.status || 'Resolved'}`;
      description = `${parsedMeta.rating ? `${parsedMeta.rating}★ rating` : ''} (${parsedMeta.category || ''})`;
      linkUrl = `/dashboard/feedback`;
    } else if (log.action.startsWith('ANNOUNCEMENT_')) {
      category = 'ADMIN';
      title = log.action === 'ANNOUNCEMENT_ARCHIVED' ? 'Announcement Archived' : 'Announcement Published';
      description = `"${parsedMeta.title || ''}"`;
      linkUrl = `/dashboard/communications`;
    } else {
      description = `Entity ${log.entityType} ID: ${log.entityId.slice(0, 8)}...`;
    }

    if (options.category && options.category !== 'ALL' && options.category !== category) {
      continue;
    }

    events.push({
      id: log.id,
      category,
      type: log.action,
      title,
      description,
      timestamp: log.createdAt,
      actorName,
      linkUrl,
    });
  }

  return events;
}
