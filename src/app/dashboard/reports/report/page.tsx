import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getBusinessReportAction } from '@/app/actions/report.actions';
import { PrintableReport } from '@/components/reports/printable-report';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { type ReportType } from '@/services/reports';

export const dynamic = 'force-dynamic';

export default async function ReportViewPage({ searchParams }: { searchParams: Promise<{ type?: string; from?: string; to?: string; branchId?: string }> }) {
  const params = await searchParams;
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const { type, from, to, branchId } = params;
  if (!type || !from || !to) {
    notFound();
  }

  const result = await getBusinessReportAction(business.id, type as ReportType, from, to, branchId);

  if (!result.success) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-red-600 text-sm">Failed to generate report: {result.errorCode || 'Unknown'} — {result.message || ''}</p>
        <Link href="/dashboard/reports" className="text-blue-600 text-sm mt-4 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </Link>
      </div>
    );
  }

  const report = result.data!;
  const branches = await prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } });
  const branchName = branchId ? branches.find((b: { id: string }) => b.id === branchId)?.name : undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-xs text-gray-500">
              {report.dateRange.from} {report.dateRange.to !== report.dateRange.from ? `to ${report.dateRange.to}` : ''}
              {branchName && ` • ${branchName}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <PrintableReport
        businessName={business.name}
        reportTitle={report.title}
        dateRange={report.dateRange}
        branchName={branchName}
        generatedAt={report.generatedAt.toISOString().replace('T', ' ').slice(0, 19)}
        summary={report.summary}
        rows={report.rows}
        totals={report.totals}
      />
    </div>
  );
}
