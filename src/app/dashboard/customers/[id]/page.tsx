import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { getCustomerWithLedger } from '@/services/customers';
import { getCustomerInsights } from '@/services/customer-insights';
import { CustomerProfileView } from '@/components/customers/customer-profile-view';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const [customerData, insights, auditLogs] = await Promise.all([
    getCustomerWithLedger(business.id, id),
    getCustomerInsights(business.id, id).catch(() => null),
    prisma.auditLog.findMany({
      where: {
        businessId: business.id,
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  if (!customerData || !insights) {
    notFound();
  }

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/customers" className="hover:text-blue-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Customer Directory
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-semibold">{customerData.customer.name}</span>
      </div>

      <CustomerProfileView
        businessId={business.id}
        customerData={customerData}
        insights={insights}
        auditLogs={auditLogs}
        isOwnerOrManager={isOwnerOrManager}
      />
    </div>
  );
}
