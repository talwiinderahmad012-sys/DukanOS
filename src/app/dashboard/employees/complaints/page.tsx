import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listComplaints } from '@/services/complaints';
import { redirect } from 'next/navigation';
import { ComplaintsBoard } from '@/components/employees/complaints-board';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ComplaintStatus } from '@/generated/prisma/client';

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { business, user, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;
  const status = (params.status || 'ALL') as ComplaintStatus | 'ALL';
  const page = Number(params.page) || 1;

  const data = await listComplaints(business.id, membership.role, user.id, {
    status,
    page,
    limit: 50,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/dashboard/employees" className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Employees
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Staff Complaints & Feedback</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage workplace issues, grievances, and track resolution.
          </p>
        </div>
      </div>

      <ComplaintsBoard businessId={business.id} initialData={data} currentStatus={status} />
    </div>
  );
}
