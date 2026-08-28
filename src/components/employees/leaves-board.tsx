'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { reviewLeaveAction } from '@/app/actions/employee.actions';
import { useTranslation } from '@/lib/i18n/language-context';

const LEAVE_TYPE_KEY: Record<string, string> = {
  CASUAL: 'employees.casualLeave',
  SICK: 'employees.sickLeave',
  ANNUAL: 'employees.annualLeave',
  UNPAID: 'employees.unpaidLeave',
  OTHER: 'employees.otherEmergencyLeave',
};

const LEAVE_STATUS_KEY: Record<string, string> = {
  PENDING: 'common.pending',
  APPROVED: 'common.approved',
  REJECTED: 'common.rejected',
  CANCELLED: 'common.cancelled',
};

const FILTER_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export function LeavesBoard({
  businessId,
  initialData,
  currentStatus,
}: {
  businessId: string;
  initialData: any;
  currentStatus: string;
}) {
  const router = useRouter();
  const { t, tm, language } = useTranslation();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';

  const handleReview = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    const notes = prompt(t('employees.reviewNotesPrompt', { status: t(LEAVE_STATUS_KEY[status]) }));
    if (notes === null) return;

    setLoadingId(leaveId);
    const res = await reviewLeaveAction(businessId, {
      leaveId,
      status,
      approvalNotes: notes
    });

    setLoadingId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(tm(res.message) || (status === 'APPROVED' ? t('employees.failedToApproveLeave') : t('employees.failedToRejectLeave')));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {FILTER_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => router.push(`/dashboard/employees/leaves?status=${status}`)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              currentStatus === status
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status === 'ALL' ? t('employees.allLeaves') : t(LEAVE_STATUS_KEY[status] ?? 'common.unknown')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-5 py-3.5 font-medium">{t('employees.tableEmployee')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.leaveType')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.duration')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.reason')}</th>
                <th className="px-5 py-3.5 font-medium">{t('common.status')}</th>
                <th className="px-5 py-3.5 font-medium text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialData.leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    {t('employees.noLeaveRequestsFound')}
                  </td>
                </tr>
              ) : (
                initialData.leaves.map((leave: any) => {
                  return (
                    <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 block">{leave.employee.name}</span>
                        <span className="text-[11px] text-gray-400 font-mono">{leave.employee.employeeCode} • {leave.employee.position}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-gray-700">
                        {t(LEAVE_TYPE_KEY[leave.leaveType] ?? 'common.unknown')}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(leave.startDate).toLocaleDateString(dateLocale)} - {new Date(leave.endDate).toLocaleDateString(dateLocale)}</span>
                        </div>
                        <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {t('employees.daysCount', { count: leave.daysCount })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600 max-w-[200px] truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          leave.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          leave.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {leave.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                          {leave.status === 'APPROVED' && <Check className="w-3.5 h-3.5" />}
                          {leave.status === 'REJECTED' && <X className="w-3.5 h-3.5" />}
                          {leave.status === 'CANCELLED' && <AlertCircle className="w-3.5 h-3.5" />}
                          {t(LEAVE_STATUS_KEY[leave.status] ?? 'common.unknown')}
                        </span>
                        {leave.approvalNotes && (
                          <span className="block text-[10px] text-gray-400 mt-1 truncate max-w-[120px]" title={leave.approvalNotes}>
                            {t('employees.notePrefix', { note: leave.approvalNotes })}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        {leave.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReview(leave.id, 'APPROVED')}
                              disabled={loadingId === leave.id}
                              className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {t('employees.approve')}
                            </button>
                            <button
                              onClick={() => handleReview(leave.id, 'REJECTED')}
                              disabled={loadingId === leave.id}
                              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {t('employees.reject')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {initialData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">
            {t('common.pageOf', { page: initialData.pagination.page, totalPages: initialData.pagination.totalPages })}
          </span>
          <div className="flex gap-2">
            {initialData.pagination.page > 1 && (
              <button
                onClick={() => router.push(`/dashboard/employees/leaves?status=${currentStatus}&page=${initialData.pagination.page - 1}`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                {t('common.previous')}
              </button>
            )}
            {initialData.pagination.page < initialData.pagination.totalPages && (
              <button
                onClick={() => router.push(`/dashboard/employees/leaves?status=${currentStatus}&page=${initialData.pagination.page + 1}`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                {t('common.next')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
