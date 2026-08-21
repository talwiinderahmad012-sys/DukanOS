import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { ComplaintStatus, ComplaintPriority, NotificationSeverity } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';

export async function createComplaint(
  businessId: string,
  submittedBy: string,
  data: {
    employeeId: string;
    title: string;
    category?: string;
    description: string;
    priority?: ComplaintPriority;
  }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, businessId },
  });

  if (!employee) {
    throw new Error('Employee not found or unauthorized.');
  }

  const priority = data.priority || ComplaintPriority.MEDIUM;

  const complaint = await prisma.employeeComplaint.create({
    data: {
      businessId,
      employeeId: data.employeeId,
      title: data.title.trim(),
      category: data.category?.trim() || 'WORKPLACE',
      description: data.description.trim(),
      priority,
      status: ComplaintStatus.OPEN,
      submittedBy,
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
    },
  });

  // If High or Urgent priority, notify Owner/Managers immediately
  if (priority === ComplaintPriority.HIGH || priority === ComplaintPriority.URGENT) {
    await prisma.notification.create({
      data: {
        businessId,
        type: 'EMPLOYEE_COMPLAINT',
        severity: priority === ComplaintPriority.URGENT ? NotificationSeverity.ALERT : NotificationSeverity.WARNING,
        title: `Urgent Complaint: ${employee.name}`,
        message: `${employee.name} submitted a ${priority.toLowerCase()} priority complaint: "${complaint.title}".`,
        isOwnerOnly: true,
        relatedEntity: 'EMPLOYEE',
        relatedEntityId: employee.id,
        deduplicationKey: `${businessId}-COMPLAINT-${complaint.id}`,
      },
    });
  }

  await recordAuditLog({
    businessId,
    userId: submittedBy,
    action: 'COMPLAINT_SUBMITTED',
    entityType: 'EmployeeComplaint',
    entityId: complaint.id,
    metadata: {
      employeeId: employee.id,
      employeeName: employee.name,
      title: complaint.title,
      priority,
    },
  });

  return complaint;
}

export async function resolveComplaint(
  businessId: string,
  resolvedBy: string,
  complaintId: string,
  status: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED',
  resolutionNote: string
) {
  const complaint = await prisma.employeeComplaint.findFirst({
    where: { id: complaintId, businessId },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, userId: true } },
    },
  });

  if (!complaint) {
    throw new Error('Complaint record not found or unauthorized.');
  }

  const updated = await prisma.employeeComplaint.update({
    where: { id: complaintId },
    data: {
      status: status as ComplaintStatus,
      resolutionNote: resolutionNote.trim(),
      resolvedBy,
      resolvedAt: new Date(),
    },
  });

  // Notify employee if they have a linked user account
  if (complaint.employee.userId) {
    await prisma.notification.create({
      data: {
        businessId,
        recipientId: complaint.employee.userId,
        type: 'COMPLAINT_UPDATE',
        severity: NotificationSeverity.INFO,
        title: `Complaint Status: ${status}`,
        message: `Your complaint "${complaint.title}" is now marked as ${status.toLowerCase().replace('_', ' ')}. Resolution: "${resolutionNote}"`,
        isOwnerOnly: false,
        relatedEntity: 'EMPLOYEE',
        relatedEntityId: complaint.employee.id,
      },
    });
  }

  await recordAuditLog({
    businessId,
    userId: resolvedBy,
    action: `COMPLAINT_${status}`,
    entityType: 'EmployeeComplaint',
    entityId: complaint.id,
    metadata: {
      employeeId: complaint.employee.id,
      employeeName: complaint.employee.name,
      status,
      resolutionNote,
    },
  });

  return updated;
}

export async function listComplaints(
  businessId: string,
  userRole: string,
  currentUserId: string,
  options: {
    employeeId?: string;
    status?: ComplaintStatus | 'ALL';
    page?: number;
    limit?: number;
  } = {}
) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { businessId };

  // Strict privacy: Ordinary employees can only see their own complaints
  if (userRole === 'EMPLOYEE') {
    where.employee = { userId: currentUserId };
  } else if (options.employeeId) {
    where.employeeId = options.employeeId;
  }

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  const [complaints, totalCount] = await Promise.all([
    prisma.employeeComplaint.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, position: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.employeeComplaint.count({ where }),
  ]);

  return {
    complaints,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}
