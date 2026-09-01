'use client';

import { useState } from 'react';
import {
  User,
  Clock,
  Calendar,
  DollarSign,
  MessageSquareWarning,
  Activity,
  Plus,
  Building,
  Phone,
  Mail,
  MapPin,
  Edit,
} from 'lucide-react';
import { QuickAttendanceModal } from './quick-attendance-modal';
import { RequestLeaveModal, ReviewLeaveModal } from './leave-request-modal';
import { CreateSalaryModal, RecordPaymentModal } from './salary-record-modal';
import { SubmitComplaintModal, ResolveComplaintModal } from './complaint-modal';
import { EmployeeForm } from './employee-form';
import { useTranslation } from '@/lib/i18n/language-context';

const EMPLOYEE_STATUS_KEY: Record<string, string> = {
  ACTIVE: 'common.active',
  ON_LEAVE: 'employees.statusOnLeave',
  SUSPENDED: 'employees.statusSuspended',
  INACTIVE: 'common.inactive',
  LEFT: 'employees.statusLeft',
};

const ATTENDANCE_STATUS_KEY: Record<string, string> = {
  PRESENT: 'employees.statusPresent',
  LATE: 'employees.statusLate',
  ABSENT: 'employees.statusAbsent',
  LEAVE: 'employees.statusOnLeave',
  HALF_DAY: 'employees.statusHalfDay',
  OFF_DAY: 'employees.statusOffDay',
};

const LEAVE_STATUS_KEY: Record<string, string> = {
  PENDING: 'common.pending',
  APPROVED: 'common.approved',
  REJECTED: 'common.rejected',
  CANCELLED: 'common.cancelled',
};

const LEAVE_TYPE_KEY: Record<string, string> = {
  CASUAL: 'employees.casualLeave',
  SICK: 'employees.sickLeave',
  ANNUAL: 'employees.annualLeave',
  UNPAID: 'employees.unpaidLeave',
  OTHER: 'employees.otherEmergencyLeave',
};

const SALARY_TYPE_KEY: Record<string, string> = {
  MONTHLY: 'employees.salaryTypeMonthly',
  DAILY: 'employees.salaryTypeDaily',
  HOURLY: 'employees.salaryTypeHourly',
};

const PAYMENT_STATUS_KEY: Record<string, string> = {
  PAID: 'common.paid',
  PENDING: 'common.pending',
};

const COMPLAINT_STATUS_KEY: Record<string, string> = {
  OPEN: 'common.open',
  IN_REVIEW: 'employees.statusInReview',
  RESOLVED: 'common.resolved',
  REJECTED: 'common.rejected',
  CLOSED: 'common.closed',
};

const PRIORITY_KEY: Record<string, string> = {
  LOW: 'common.low',
  MEDIUM: 'common.medium',
  HIGH: 'common.high',
  URGENT: 'employees.priorityUrgent',
};

const CATEGORY_KEY: Record<string, string> = {
  WORKPLACE: 'employees.categoryWorkplace',
  PAYROLL: 'employees.categoryPayroll',
  SAFETY: 'employees.categorySafety',
  BEHAVIOR: 'employees.categoryBehavior',
  OTHER: 'employees.categoryOther',
};

export function EmployeeProfileView({
  businessId,
  employeeData,
  auditLogs,
  branches,
  isOwnerOrManager,
}: {
  businessId: string;
  employeeData: any;
  auditLogs: any[];
  branches: { id: string; name: string }[];
  isOwnerOrManager: boolean;
}) {
  const { t, language, formatCurrency } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const { employee, stats } = employeeData;
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'leave' | 'salary' | 'complaints' | 'activity'>('overview');
  const [isEditing, setIsEditing] = useState(false);

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [reviewLeaveId, setReviewLeaveId] = useState<string | null>(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [paySalaryId, setPaySalaryId] = useState<{ id: string; period: string; netSalary: number } | null>(null);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [resolveComplaintData, setResolveComplaintData] = useState<{ id: string; title: string } | null>(null);

  const tabs = [
    { id: 'overview', label: t('employees.tabOverview'), icon: User },
    { id: 'attendance', label: t('employees.attendanceCount', { count: employee.attendances.length }), icon: Clock },
    { id: 'leave', label: t('employees.leaveCount', { count: employee.leaves.length }), icon: Calendar },
    ...(isOwnerOrManager
      ? [{ id: 'salary', label: t('employees.salaryHistoryCount', { count: employee.salaries.length }), icon: DollarSign }]
      : []),
    { id: 'complaints', label: t('employees.complaintsCount', { count: employee.complaints.length }), icon: MessageSquareWarning },
    { id: 'activity', label: t('employees.tabActivity'), icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-gray-950 font-bold text-xl flex items-center justify-center shrink-0">
            {employee.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                {employee.employeeCode}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  employee.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : employee.status === 'ON_LEAVE'
                    ? 'bg-blue-100 text-gray-900'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {t(EMPLOYEE_STATUS_KEY[employee.status] ?? 'common.unknown')}
              </span>
            </div>

            <p className="text-xs text-gray-500 flex flex-wrap items-center gap-3">
              <span className="font-medium text-gray-700">{employee.position}</span>
              {employee.department && <span>• {employee.department}</span>}
              {employee.branch && <span>• {employee.branch.name}</span>}
              <span>
                • {t('employees.joined', { date: new Date(employee.joiningDate).toLocaleDateString(dateLocale) })}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setAttendanceModalOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5" /> {t('employees.markAttendanceButton')}
          </button>

          {isOwnerOrManager && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-gray-500" /> {isEditing ? t('employees.closeEdit') : t('employees.editProfile')}
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">{t('employees.editStaffInformation')}</h2>
          <EmployeeForm businessId={businessId} branches={branches} initialData={employee} />
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase">{t('employees.attendanceRate')}</span>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.attendanceRate}%</h3>
              <span className="text-[11px] text-gray-400">{t('employees.past30Days')}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-green-700 uppercase">{t('employees.daysPresent')}</span>
              <h3 className="text-2xl font-bold text-green-700 mt-1">{stats.presentCount}</h3>
              <span className="text-[11px] text-green-600">{t('employees.onTimeDuty')}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-amber-700 uppercase">{t('employees.lateArrivals')}</span>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{stats.lateCount}</h3>
              <span className="text-[11px] text-amber-600">{t('employees.loggedTardy')}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-red-700 uppercase">{t('employees.unexcusedAbsences')}</span>
              <h3 className="text-2xl font-bold text-red-700 mt-1">{stats.absentCount}</h3>
              <span className="text-[11px] text-red-500">{t('employees.recordedAbsent')}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-purple-700 uppercase">{t('employees.approvedLeaves')}</span>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">{stats.approvedLeavesCount}</h3>
              <span className="text-[11px] text-purple-600">{t('employees.totalRequests')}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm border-b pb-3">{t('employees.staffProfileInformation')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-3 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">{t('common.phone')}</span>
                  <span className="font-semibold text-gray-900">{employee.phone || t('employees.notProvided')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">{t('common.email')}</span>
                  <span className="font-semibold text-gray-900">{employee.email || t('employees.notProvided')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">{t('employees.residentialAddress')}</span>
                  <span className="font-semibold text-gray-900">{employee.address || t('employees.notProvided')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Building className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">{t('employees.assignedBranch')}</span>
                  <span className="font-semibold text-gray-900">{employee.branch?.name || t('employees.mainStore')}</span>
                </div>
              </div>

              {isOwnerOrManager && (
                <div className="flex items-center gap-3 text-gray-700">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 block">{t('employees.currentSalaryBaseline')}</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {formatCurrency(Number(employee.basicSalary))} ({t(SALARY_TYPE_KEY[employee.salaryType] ?? 'common.unknown')})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {employee.notes && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 mt-4">
                <span className="font-bold text-gray-800 block mb-1">{t('employees.hrNotes')}</span>
                {employee.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm">{t('employees.attendanceLogLast30Days')}</h3>
            <button
              onClick={() => setAttendanceModalOpen(true)}
              className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {t('employees.markLog')}
            </button>
          </div>

          {employee.attendances.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">{t('employees.noAttendanceEntries')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <th className="px-4 py-2.5 font-medium">{t('common.date')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('common.status')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('employees.checkInLabel')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('employees.checkOutLabel')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('common.notes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.attendances.map((att: any) => (
                    <tr key={att.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {new Date(att.date).toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            att.status === 'PRESENT'
                              ? 'bg-green-100 text-green-800'
                              : att.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : att.status === 'ABSENT'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-gray-900'
                          }`}
                        >
                          {t(ATTENDANCE_STATUS_KEY[att.status] ?? 'common.unknown')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{att.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm">{t('employees.leaveHistoryApplications')}</h3>
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {t('employees.requestLeave')}
            </button>
          </div>

          {employee.leaves.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">{t('employees.noLeaveApplications')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <th className="px-4 py-2.5 font-medium">{t('common.type')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('employees.dates')}</th>
                    <th className="px-4 py-2.5 font-medium text-center">{t('employees.days')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('employees.reason')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('common.status')}</th>
                    <th className="px-4 py-2.5 font-medium text-end">{t('employees.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.leaves.map((leave: any) => (
                    <tr key={leave.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-semibold text-gray-900">
                        {t(LEAVE_TYPE_KEY[leave.leaveType] ?? 'common.unknown')}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {new Date(leave.startDate).toLocaleDateString(dateLocale)} – {new Date(leave.endDate).toLocaleDateString(dateLocale)}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-900">{leave.daysCount}</td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">
                        {leave.reason}
                        {leave.approvalNotes && (
                          <span className="block text-[11px] text-gray-900 font-medium">
                            {t('employees.notePrefix', { note: leave.approvalNotes })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            leave.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : leave.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : leave.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {t(LEAVE_STATUS_KEY[leave.status] ?? 'common.unknown')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-end">
                        {isOwnerOrManager && leave.status === 'PENDING' && (
                          <button
                            onClick={() => setReviewLeaveId(leave.id)}
                            className="text-xs text-gray-900 hover:underline font-semibold"
                          >
                            {t('employees.reviewArrow')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'salary' && isOwnerOrManager && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t('employees.payrollHeader')}</h3>
              <p className="text-xs text-gray-400">{t('employees.salaryFormula')}</p>
            </div>
            <button
              onClick={() => setSalaryModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {t('employees.generateSalaryRecord')}
            </button>
          </div>

          {employee.salaries.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">{t('employees.noPayrollRecords')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <th className="px-4 py-2.5 font-medium">{t('employees.period')}</th>
                    <th className="px-4 py-2.5 font-medium text-end">{t('employees.base')}</th>
                    <th className="px-4 py-2.5 font-medium text-end">{t('employees.otBonus')}</th>
                    <th className="px-4 py-2.5 font-medium text-end">{t('employees.deductions')}</th>
                    <th className="px-4 py-2.5 font-medium text-end">{t('employees.netPayable')}</th>
                    <th className="px-4 py-2.5 font-medium text-center">{t('common.status')}</th>
                    <th className="px-4 py-2.5 font-medium text-end">{t('employees.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.salaries.map((sal: any) => (
                    <tr key={sal.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-mono font-bold text-gray-900">{sal.period}</td>
                      <td className="px-4 py-2.5 text-end font-medium text-gray-800">
                        {formatCurrency(Number(sal.baseSalary))}
                      </td>
                      <td className="px-4 py-2.5 text-end text-green-600 font-medium">
                        +{formatCurrency(Number(sal.overtime) + Number(sal.bonus))}
                      </td>
                      <td className="px-4 py-2.5 text-end text-red-600 font-medium">
                        -{formatCurrency(Number(sal.deductions) + Number(sal.advance))}
                      </td>
                      <td className="px-4 py-2.5 text-end font-bold text-emerald-700 text-sm">
                        {formatCurrency(Number(sal.netSalary))}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            sal.paymentStatus === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t(PAYMENT_STATUS_KEY[sal.paymentStatus] ?? 'common.unknown')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-end">
                        {sal.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => setPaySalaryId({ id: sal.id, period: sal.period, netSalary: Number(sal.netSalary) })}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold"
                          >
                            {t('employees.payNow')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t('employees.workplaceFeedback')}</h3>
              <p className="text-xs text-gray-400">{t('employees.complaintConfidential')}</p>
            </div>
            <button
              onClick={() => setComplaintModalOpen(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {t('employees.submitIssue')}
            </button>
          </div>

          {employee.complaints.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">{t('employees.noComplaintsReported')}</div>
          ) : (
            <div className="divide-y divide-gray-100 space-y-3">
              {employee.complaints.map((c: any) => (
                <div key={c.id} className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.priority === 'URGENT' || c.priority === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {t(PRIORITY_KEY[c.priority] ?? 'common.unknown')}
                      </span>
                      <h4 className="font-bold text-gray-900 text-xs">{c.title}</h4>
                      <span className="text-[11px] text-gray-400">({t(CATEGORY_KEY[c.category] ?? 'common.unknown')})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800'
                            : c.status === 'IN_REVIEW'
                            ? 'bg-blue-100 text-gray-900'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t(COMPLAINT_STATUS_KEY[c.status] ?? 'common.unknown')}
                      </span>

                      {isOwnerOrManager && c.status !== 'RESOLVED' && (
                        <button
                          onClick={() => setResolveComplaintData({ id: c.id, title: c.title })}
                          className="text-xs text-gray-900 hover:underline font-semibold"
                        >
                          {t('employees.resolveArrow')}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">{c.description}</p>

                  {c.resolutionNote && (
                    <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900">
                      <span className="font-bold block text-green-950">{t('employees.managementResolution')}</span>
                      {c.resolutionNote}
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 block pt-1">
                    {t('employees.submittedOn', { date: new Date(c.createdAt).toLocaleDateString(dateLocale) })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b pb-3">{t('employees.auditLogHistory')}</h3>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">{t('employees.noAuditEvents')}</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-gray-900">{log.action}</span>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      {log.metadata ? JSON.stringify(JSON.parse(log.metadata)) : '—'}
                    </p>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString(dateLocale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <QuickAttendanceModal
        businessId={businessId}
        employeeId={employee.id}
        employeeName={employee.name}
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
      />

      <RequestLeaveModal
        businessId={businessId}
        employeeId={employee.id}
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
      />

      {reviewLeaveId && (
        <ReviewLeaveModal
          businessId={businessId}
          leaveId={reviewLeaveId}
          employeeName={employee.name}
          isOpen={!!reviewLeaveId}
          onClose={() => setReviewLeaveId(null)}
        />
      )}

      <CreateSalaryModal
        businessId={businessId}
        employeeId={employee.id}
        employees={[{ id: employee.id, name: employee.name, basicSalary: Number(employee.basicSalary) }]}
        defaultBaseSalary={Number(employee.basicSalary)}
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
      />

      {paySalaryId && (
        <RecordPaymentModal
          businessId={businessId}
          salaryId={paySalaryId.id}
          period={paySalaryId.period}
          netSalary={paySalaryId.netSalary}
          isOpen={!!paySalaryId}
          onClose={() => setPaySalaryId(null)}
        />
      )}

      <SubmitComplaintModal
        businessId={businessId}
        employeeId={employee.id}
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
      />

      {resolveComplaintData && (
        <ResolveComplaintModal
          businessId={businessId}
          complaintId={resolveComplaintData.id}
          complaintTitle={resolveComplaintData.title}
          isOpen={!!resolveComplaintData}
          onClose={() => setResolveComplaintData(null)}
        />
      )}
    </div>
  );
}
