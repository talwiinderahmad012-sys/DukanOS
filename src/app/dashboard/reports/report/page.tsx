import { requireActiveBusiness } from '@/lib/auth/guards';
import { getBusinessReportAction } from '@/app/actions/report.actions';
import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { type ReportType } from '@/services/reports';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { ReportViewClient, type ReportResultData } from './report-view-client';

export const dynamic = 'force-dynamic';

function serializeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  const num = Number(String(value));
  return Number.isFinite(num) ? num : String(value);
}

export default async function ReportViewPage({ searchParams }: { searchParams: Promise<{ type?: string; from?: string; to?: string; branchId?: string }> }) {
  const params = await searchParams;
  const { business, membership } = await requireActiveBusiness();
  if (!canAccessDashboardPath(membership.role, '/dashboard/reports/report')) {
    return <ForbiddenView role={membership.role} />;
  }

  const { type, from, to, branchId } = params;
  if (!type || !from || !to) {
    notFound();
  }

  const result = await getBusinessReportAction(business.id, type as ReportType, from, to, branchId);

  if (!result.success) {
    return (
      <ReportViewClient
        businessName={business.name}
        error={{ errorCode: result.errorCode ?? null, message: result.message ?? null }}
      />
    );
  }

  const report = result.data!;
  const branches = await prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } });
  const branchName = branchId ? branches.find((b: { id: string }) => b.id === branchId)?.name : undefined;

  const reportData: ReportResultData = {
    type: report.type,
    title: report.title,
    dateRange: { from: report.dateRange.from, to: report.dateRange.to },
    generatedAt: report.generatedAt.toISOString().replace('T', ' ').slice(0, 19),
    summary: Object.fromEntries(
      Object.entries(report.summary).map(([key, value]) => [key, serializeValue(value)])
    ),
    rows: report.rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, serializeValue(value)]))
    ),
    totals: Object.fromEntries(
      Object.entries(report.totals).map(([key, value]) => [key, Number(serializeValue(value)) || 0])
    ),
  };

  return (
    <ReportViewClient
      businessName={business.name}
      branchName={branchName}
      report={reportData}
    />
  );
}
