'use client';

import Link from 'next/link';
import { Calendar, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

const PayrollStatus = { FINALIZED: 'FINALIZED', PAID: 'PAID' };

export function PayrollList({ payrolls }: { payrolls: any[] }) {
  if (payrolls.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900">No payroll periods found</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Create your first payroll period to start managing employee salaries.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
            <th className="px-5 py-3.5 font-medium">Period</th>
            <th className="px-5 py-3.5 font-medium">Date Range</th>
            <th className="px-5 py-3.5 font-medium">Employees</th>
            <th className="px-5 py-3.5 font-medium">Status</th>
            <th className="px-5 py-3.5 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payrolls.map((payroll) => (
            <tr key={payroll.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3.5">
                <Link href={`/dashboard/payroll/${payroll.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors block">
                  {payroll.periodName}
                </Link>
                <span className="text-[11px] text-gray-400">Created by {payroll.createdBy || 'System'}</span>
              </td>
              <td className="px-5 py-3.5 text-xs text-gray-600 font-mono">
                {new Date(payroll.startDate).toLocaleDateString()} - {new Date(payroll.endDate).toLocaleDateString()}
              </td>
              <td className="px-5 py-3.5 text-xs text-gray-600 font-bold">
                {payroll._count.employeeSalary} <span className="font-normal text-gray-400 text-[11px]">salaries</span>
              </td>
              <td className="px-5 py-3.5">
                {payroll.status === PayrollStatus.FINALIZED || payroll.status === PayrollStatus.PAID ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                    <CheckCircle2 className="w-3 h-3" /> {payroll.status}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    <AlertCircle className="w-3 h-3" /> {payroll.status}
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 text-right">
                <Link href={`/dashboard/payroll/${payroll.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                  Manage &rarr;
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

