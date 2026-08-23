import 'server-only';
import { prisma } from '@/lib/db/prisma';

export type NotifyEmployeeInput = {
  title: string;
  message: string;
  severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'ALERT';
  relatedEntity?: string;
  relatedEntityId?: string;
};

/**
 * Creates an internal in-app notification scoped to a specific employee's
 * linked user account. If the employee has no user account, or notification
 * creation fails, the operation is a silent no-op - callers (payroll,
 * attendance, leave) must never break because of notification issues.
 */
export async function notifyEmployee(
  businessId: string,
  employeeId: string,
  input: NotifyEmployeeInput
) {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, businessId },
      select: { id: true, userId: true },
    });

    // No employee, or no linked user account to deliver to.
    if (!employee?.userId) return null;

    return await prisma.notification.create({
      data: {
        businessId,
        recipientId: employee.userId,
        type: 'SYSTEM',
        severity: input.severity ?? 'INFO',
        title: input.title,
        message: input.message,
        isOwnerOnly: false,
        relatedEntity: input.relatedEntity ?? 'EMPLOYEE',
        relatedEntityId: input.relatedEntityId ?? employee.id,
      },
    });
  } catch (error) {
    console.error('[employee-notification] failed:', error);
    return null;
  }
}

/**
 * Returns notifications for the given user within a business. Strictly
 * scoped: only notifications addressed to this recipient are returned -
 * an employee can never read another employee's notifications.
 */
export async function getEmployeeNotifications(businessId: string, userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: {
      businessId,
      recipientId: userId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
