'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Clock, Calendar, Check, X } from 'lucide-react';
import { recordAttendanceAction } from '@/app/actions/employee.actions';
import { useTranslation } from '@/lib/i18n/language-context';

type AttendanceStatusOption = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'OFF_DAY';

const OTHER_STATUS_KEY: Record<string, string> = {
  HALF_DAY: 'employees.statusHalfDay',
  OFF_DAY: 'employees.statusOffDay',
};

export function AttendanceBoard({
  businessId,
  initialData,
  date,
}: {
  businessId: string;
  initialData: any;
  date: string;
}) {
  const router = useRouter();
  const { t, tm, language } = useTranslation();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleMarkAttendance = async (employeeId: string, status: AttendanceStatusOption) => {
    setLoadingId(employeeId);

    const checkIn = (status === 'PRESENT' || status === 'LATE') ? new Date().toISOString() : undefined;

    const res = await recordAttendanceAction(businessId, {
      employeeId,
      date,
      status,
      checkIn
    });

    setLoadingId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(tm(res.message) || t('employees.failedToRecordAttendance'));
    }
  };

  const timeLocale = language === 'UR' ? 'ur-PK' : 'en-PK';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">{t('common.date')}:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                router.push(`/dashboard/employees/attendance?date=${e.target.value}`);
              }
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex gap-4 sm:gap-6 text-sm">
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-xs font-semibold">{t('common.total')}</span>
            <span className="font-bold">{initialData.summary.totalEmployees}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-600 text-xs font-semibold">{t('employees.statusPresent')}</span>
            <span className="font-bold text-green-700">{initialData.summary.presentCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-red-600 text-xs font-semibold">{t('employees.statusAbsent')}</span>
            <span className="font-bold text-red-700">{initialData.summary.absentCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-900 text-xs font-semibold">{t('employees.leaveShort')}</span>
            <span className="font-bold text-gray-950">{initialData.summary.leaveCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-5 py-3.5 font-medium">{t('employees.code')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.tableEmployee')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.branch')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.currentStatus')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.checkInOut')}</th>
                <th className="px-5 py-3.5 font-medium">{t('employees.quickMark')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialData.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    {t('employees.noActiveEmployees')}
                  </td>
                </tr>
              ) : (
                initialData.records.map(({ employee, attendance }: any) => {
                  const isMarked = !!attendance;
                  const status = attendance?.status;

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                          {employee.employeeCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {employee.name}
                        <span className="block text-[11px] text-gray-400 font-normal">{employee.position}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        {employee.branch?.name || '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        {isMarked ? (
                          status === 'PRESENT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t('employees.statusPresent')}
                            </span>
                          ) : status === 'LATE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5" /> {t('employees.statusLate')}
                            </span>
                          ) : status === 'ABSENT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                              <AlertCircle className="w-3.5 h-3.5" /> {t('employees.statusAbsent')}
                            </span>
                          ) : status === 'LEAVE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-gray-900">
                              <Calendar className="w-3.5 h-3.5" /> {t('employees.statusOnLeave')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                              {t(OTHER_STATUS_KEY[status] ?? 'common.unknown')}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">{t('employees.statusUnrecorded')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {attendance?.checkIn ? (
                          <div className="flex flex-col gap-0.5 text-gray-600">
                            <span>
                              {t('employees.checkInAt', {
                                time: new Date(attendance.checkIn).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' }),
                              })}
                            </span>
                            {attendance.checkOut && (
                              <span>
                                {t('employees.checkOutAt', {
                                  time: new Date(attendance.checkOut).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' }),
                                })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMarkAttendance(employee.id, 'PRESENT')}
                            disabled={loadingId === employee.id || (isMarked && status === 'PRESENT')}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            title={t('employees.markPresent')}
                            aria-label={t('employees.markPresent')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(employee.id, 'ABSENT')}
                            disabled={loadingId === employee.id || (isMarked && status === 'ABSENT')}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            title={t('employees.markAbsent')}
                            aria-label={t('employees.markAbsent')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <select
                            value={isMarked ? status : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleMarkAttendance(employee.id, e.target.value as AttendanceStatusOption);
                              }
                            }}
                            disabled={loadingId === employee.id}
                            className="ms-2 py-1 px-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary bg-white disabled:opacity-50"
                          >
                            <option value="" disabled>{t('employees.otherOptions')}</option>
                            <option value="LATE">{t('employees.statusLate')}</option>
                            <option value="HALF_DAY">{t('employees.statusHalfDay')}</option>
                            <option value="LEAVE">{t('employees.leaveShort')}</option>
                            <option value="OFF_DAY">{t('employees.statusOffDay')}</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
