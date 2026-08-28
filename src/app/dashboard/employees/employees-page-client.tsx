'use client';

import Link from 'next/link';
import {
  Users,
  UserPlus,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MessageSquareWarning,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type EmployeeDirectoryRow = {
  id: string;
  employeeCode: string;
  name: string;
  phone: string | null;
  position: string;
  department: string | null;
  status: string;
  todayStatus: string | null;
};

export type DirectoryStats = {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  openComplaints: number;
};

export type DirectoryPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const EMPLOYEE_STATUS_KEY: Record<string, string> = {
  ACTIVE: 'common.active',
  ON_LEAVE: 'employees.statusOnLeave',
  SUSPENDED: 'employees.statusSuspended',
  INACTIVE: 'common.inactive',
  LEFT: 'employees.statusLeft',
};

export function EmployeesPageClient({
  stats,
  employees,
  pagination,
  search,
  status,
}: {
  stats: DirectoryStats;
  employees: EmployeeDirectoryRow[];
  pagination: DirectoryPagination;
  search: string;
  status: string;
}) {
  const { t } = useTranslation();

  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('employees.directoryTitle')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('employees.directorySubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/employees/attendance"
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Clock className="w-4 h-4" /> {t('employees.attendance')}
          </Link>
          <Link
            href="/dashboard/employees/leaves"
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Calendar className="w-4 h-4" /> {t('employees.leaves')}
          </Link>
          <Link
            href="/dashboard/employees/complaints"
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <MessageSquareWarning className="w-4 h-4" /> {t('employees.complaints')}
          </Link>
          <Link
            href="/dashboard/employees/new"
            className="bg-primary hover:bg-primary-hover text-on-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" /> {t('employees.addEmployee')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">{t('employees.totalStaff')}</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</h3>
          <span className="text-[11px] text-gray-400">{t('employees.activeCount', { count: stats.activeEmployees })}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-green-700 uppercase">{t('employees.presentToday')}</span>
          <h3 className="text-2xl font-bold text-green-700 mt-1">{stats.presentToday}</h3>
          <span className="text-[11px] text-green-600">{t('employees.onDuty')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-red-700 uppercase">{t('employees.absentToday')}</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">{stats.absentToday}</h3>
          <span className="text-[11px] text-red-500">{t('employees.unexcused')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-950 uppercase">{t('employees.pendingLeaves')}</span>
          <h3 className="text-2xl font-bold text-gray-950 mt-1">{stats.pendingLeaves}</h3>
          <span className="text-[11px] text-gray-800">{t('employees.awaitingApproval')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase">{t('employees.complaints')}</span>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{stats.openComplaints}</h3>
          <span className="text-[11px] text-amber-600">{t('employees.underReview')}</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
        <form method="GET" className="relative flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder={t('employees.directorySearchPlaceholder')}
              className="w-full ps-9 pe-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">{t('employees.allStatuses')}</option>
            <option value="ACTIVE">{t('employees.activeStaff')}</option>
            <option value="ON_LEAVE">{t('employees.statusOnLeave')}</option>
            <option value="SUSPENDED">{t('employees.statusSuspended')}</option>
            <option value="INACTIVE">{t('employees.statusArchivedInactive')}</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            {t('common.filter')}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {employees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary-soft text-gray-900 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">{t('employees.noStaffFound')}</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">{t('employees.noStaffFoundDescription')}</p>
            <Link
              href="/dashboard/employees/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-hover transition-colors"
            >
              <UserPlus className="w-4 h-4" /> {t('employees.addFirstEmployee')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-5 py-3.5 font-medium">{t('employees.code')}</th>
                  <th className="px-5 py-3.5 font-medium">{t('employees.tableEmployee')}</th>
                  <th className="px-5 py-3.5 font-medium">{t('employees.positionAndDept')}</th>
                  <th className="px-5 py-3.5 font-medium">{t('employees.todayAttendance')}</th>
                  <th className="px-5 py-3.5 font-medium">{t('employees.tableStatus')}</th>
                  <th className="px-5 py-3.5 font-medium text-end">{t('employees.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                          {emp.employeeCode}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <Link
                          href={`/dashboard/employees/${emp.id}`}
                          className="font-bold text-gray-900 hover:text-gray-900 transition-colors block"
                        >
                          {emp.name}
                        </Link>
                        <span className="text-xs text-gray-400 font-mono">{emp.phone || t('common.noPhone')}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800 text-xs">{emp.position}</p>
                        {emp.department && (
                          <span className="text-[11px] text-gray-400 block">{emp.department}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {emp.todayStatus === 'PRESENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t('employees.statusPresent')}
                          </span>
                        ) : emp.todayStatus === 'LATE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5" /> {t('employees.statusLate')}
                          </span>
                        ) : emp.todayStatus === 'ABSENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            <AlertCircle className="w-3.5 h-3.5" /> {t('employees.statusAbsent')}
                          </span>
                        ) : emp.todayStatus === 'LEAVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-gray-900">
                            <Calendar className="w-3.5 h-3.5" /> {t('employees.statusOnLeave')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">{t('employees.notMarkedToday')}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : emp.status === 'ON_LEAVE'
                              ? 'bg-primary-soft text-gray-950 border border-blue-200'
                              : emp.status === 'SUSPENDED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {t(EMPLOYEE_STATUS_KEY[emp.status] ?? 'common.unknown')}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-end">
                        <Link
                          href={`/dashboard/employees/${emp.id}`}
                          className="text-xs font-semibold text-gray-900 hover:text-gray-900 flex items-center justify-end gap-0.5"
                        >
                          {t('employees.viewProfile')} <ChevronRight className="w-3.5 h-3.5 rtl-flip" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              {t('common.showingRange', { start: rangeStart, end: rangeEnd, total: pagination.total })}
            </span>
            <div className="flex gap-1">
              {pagination.page > 1 && (
                <Link
                  href={`/dashboard/employees?page=${pagination.page - 1}`}
                  className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                >
                  {t('common.previous')}
                </Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={`/dashboard/employees?page=${pagination.page + 1}`}
                  className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                >
                  {t('common.next')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
