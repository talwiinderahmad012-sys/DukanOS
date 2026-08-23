'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateSalariesAction, finalizePayrollAction, recordSalaryPaymentAction } from '@/app/actions/payroll.actions';
import { CheckCircle2, AlertCircle, Play, FileCheck } from 'lucide-react';

const PayrollStatus = { DRAFT: 'DRAFT', FINALIZED: 'FINALIZED', PAID: 'PAID' };
const SalaryPaymentStatus = { PAID: 'PAID', PENDING: 'PENDING' };

export function PayrollDetailClient({ businessId, payroll }: { businessId: string, payroll: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [payModal, setPayModal] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateSalariesAction(businessId, payroll.id);
    if (res.success) router.refresh();
    else setError(res.message || 'Error occurred');
    setLoading(false);
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize this payroll? Historical salaries cannot be changed.')) return;
    setLoading(true);
    const res = await finalizePayrollAction(businessId, payroll.id);
    if (res.success) router.refresh();
    else setError(res.message || 'Error occurred');
    setLoading(false);
  };

  const handlePay = async (salaryId: string, amount: number) => {
    setLoading(true);
    const res = await recordSalaryPaymentAction(businessId, salaryId, { amount, paymentMethod });
    if (res.success) {
      setPayModal(null);
      router.refresh();
    } else {
      setError(res.message || 'Error occurred');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 text-sm">Employee Salaries</h3>
        <div className="flex gap-2">
          {payroll.status === PayrollStatus.DRAFT && (
            <>
              <button onClick={handleGenerate} disabled={loading} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-gray-50">
                <Play className="w-3.5 h-3.5" /> Generate Salaries
              </button>
              {payroll.employeeSalary.length > 0 && (
                <button onClick={handleFinalize} disabled={loading} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-blue-700">
                  <FileCheck className="w-3.5 h-3.5" /> Finalize Payroll
                </button>
              )}
            </>
          )}
          {payroll.status === PayrollStatus.FINALIZED && (
            <span className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Finalized
            </span>
          )}
        </div>
      </div>

      {error && <div className="p-3 m-4 bg-red-50 text-red-700 text-xs rounded-xl">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b">
              <th className="px-5 py-3.5 font-medium">Employee</th>
              <th className="px-5 py-3.5 font-medium">Base Salary</th>
              <th className="px-5 py-3.5 font-medium">Net Salary</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payroll.employeeSalary.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-xs">
                  No salaries generated yet. Click "Generate Salaries" to populate.
                </td>
              </tr>
            ) : (
              payroll.employeeSalary.map((salary: any) => (
                <tr key={salary.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-gray-900">{salary.employee.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{salary.employee.employeeCode} &bull; {salary.employee.position}</div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-900 font-mono">Rs. {Number(salary.baseSalary).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-gray-900 font-mono">Rs. {Number(salary.netSalary).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    {salary.paymentStatus === SalaryPaymentStatus.PAID ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded-md">PAID</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">PENDING</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {payroll.status === PayrollStatus.FINALIZED && salary.paymentStatus !== SalaryPaymentStatus.PAID && (
                      payModal === salary.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="px-2 py-1 text-xs border rounded">
                            <option value="CASH">CASH</option>
                            <option value="BANK_TRANSFER">BANK TRANSFER</option>
                            <option value="MOBILE_WALLET">MOBILE WALLET</option>
                          </select>
                          <button onClick={() => handlePay(salary.id, Number(salary.netSalary))} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Confirm Pay</button>
                          <button onClick={() => setPayModal(null)} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setPayModal(salary.id)} className="text-xs font-semibold text-blue-600 hover:underline">
                          Pay Now &rarr;
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

