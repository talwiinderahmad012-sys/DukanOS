import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Banknote } from 'lucide-react';
import { PayrollDetailClient } from './payroll-detail-client';

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const payroll = await prisma.payroll.findUnique({
    where: { id, businessId: business.id },
    include: {
      employeeSalary: {
        include: {
          employee: { select: { id: true, name: true, employeeCode: true, position: true } }
        }
      }
    }
  });

  if (!payroll) redirect('/dashboard/payroll');

  const salaries = payroll.employeeSalary;
  const totalBase = salaries.reduce((sum, s) => sum + Number(s.baseSalary), 0);
  const totalNet = salaries.reduce((sum, s) => sum + Number(s.netSalary), 0);
  const paidCount = salaries.filter(s => s.paymentStatus === 'PAID').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/payroll" className="hover:text-blue-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> All Payrolls
        </Link>
        <span className="text-gray-900 font-semibold">&bull; {payroll.periodName}</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{payroll.periodName} Payroll</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date(payroll.startDate).toLocaleDateString()} - {new Date(payroll.endDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Net Salary</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">Rs. {totalNet.toLocaleString()}</h3>
          <span className="text-[11px] text-gray-400">Gross: Rs. {totalBase.toLocaleString()}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-green-700 uppercase">Salaries Paid</span>
          <h3 className="text-2xl font-bold text-green-700 mt-1">{paidCount} / {salaries.length}</h3>
          <span className="text-[11px] text-green-600">Employees</span>
        </div>
      </div>

      <PayrollDetailClient businessId={business.id} payroll={payroll} />
    </div>
  );
}

