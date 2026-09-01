import { requireActiveBusiness } from '@/lib/auth/guards';
import { listComplaints } from '@/services/complaints';
import { ComplaintStatus } from '@/generated/prisma/client';
import { ComplaintsPageClient, type ComplaintsBoardData } from './complaints-page-client';

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { business, user, membership } = await requireActiveBusiness();
  const params = await searchParams;
  const status = (params.status || 'ALL') as ComplaintStatus | 'ALL';
  const page = Number(params.page) || 1;

  const data = await listComplaints(business.id, membership.role, user.id, {
    status,
    page,
    limit: 50,
  });

  const initialData: ComplaintsBoardData = {
    complaints: data.complaints.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      priority: c.priority,
      status: c.status,
      resolutionNote: c.resolutionNote,
      employee: {
        id: c.employee.id,
        name: c.employee.name,
        employeeCode: c.employee.employeeCode,
        position: c.employee.position,
      },
    })),
    pagination: {
      total: data.pagination.total,
      page: data.pagination.page,
      limit: data.pagination.limit,
      totalPages: data.pagination.totalPages,
    },
  };

  return <ComplaintsPageClient businessId={business.id} initialData={initialData} currentStatus={status} />;
}
