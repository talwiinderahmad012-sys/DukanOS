import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Banknote, FileText, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { PayrollList } from './payroll-list';

export default async function PayrollPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  // Get active payrolls
  const payrolls = await prisma.payroll.findMany({
    where: { businessId: business.id },
    include: {
      _count: {
        select: { employeeSalary: true }
      }
    },
    orderBy: { startDate: 'desc' }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage employee salaries, payroll periods, and final payments.
          </p>
        </div>

        <Link
          href="/dashboard/payroll/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" /> Create Payroll Period
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Periods</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{payrolls.length}</h3>
          <span className="text-[11px] text-gray-400">Total payrolls</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <PayrollList payrolls={payrolls} />
      </div>
    </div>
  );
}

