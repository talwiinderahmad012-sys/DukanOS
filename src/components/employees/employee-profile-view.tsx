'use client';

import { useState } from 'react';
import { 
  User, 
  Clock, 
  Calendar, 
  DollarSign, 
  MessageSquareWarning, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  CreditCard,
  Building,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Edit,
  ShieldAlert
} from 'lucide-react';
import { QuickAttendanceModal } from './quick-attendance-modal';
import { RequestLeaveModal, ReviewLeaveModal } from './leave-request-modal';
import { CreateSalaryModal, RecordPaymentModal } from './salary-record-modal';
import { SubmitComplaintModal, ResolveComplaintModal } from './complaint-modal';
import { EmployeeForm } from './employee-form';

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
  const { employee, stats } = employeeData;
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'leave' | 'salary' | 'complaints' | 'activity'>('overview');
  const [isEditing, setIsEditing] = useState(false);

  // Modals
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [reviewLeaveId, setReviewLeaveId] = useState<string | null>(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [paySalaryId, setPaySalaryId] = useState<{ id: string; period: string; netSalary: number } | null>(null);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [resolveComplaintData, setResolveComplaintData] = useState<{ id: string; title: string } | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'attendance', label: `Attendance (${employee.attendances.length})`, icon: Clock },
    { id: 'leave', label: `Leave (${employee.leaves.length})`, icon: Calendar },
    ...(isOwnerOrManager ? [{ id: 'salary', label: `Salary History (${employee.salaries.length})`, icon: DollarSign }] : []),
    { id: 'complaints', label: `Complaints (${employee.complaints.length})`, icon: MessageSquareWarning },
    { id: 'activity', label: 'Activity & Audit', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center shrink-0">
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
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {employee.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-xs text-gray-500 flex flex-wrap items-center gap-3">
              <span className="font-medium text-gray-700">{employee.position}</span>
              {employee.department && <span>• {employee.department}</span>}
              {employee.branch && <span>• {employee.branch.name}</span>}
              <span>• Joined {new Date(employee.joiningDate).toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setAttendanceModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5" /> Mark Attendance
          </button>

          {isOwnerOrManager && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-gray-500" /> {isEditing ? 'Close Edit' : 'Edit Profile'}
            </button>
          )}
        </div>
      </div>

      {/* Editing Mode Container */}
      {isEditing && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">Edit Staff Information</h2>
          <EmployeeForm businessId={businessId} branches={branches} initialData={employee} />
        </div>
      )}

      {/* Tabs Switcher */}
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
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Factual Performance Summary KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase">Attendance Rate</span>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{stats.attendanceRate}%</h3>
              <span className="text-[11px] text-gray-400">Past 30 days</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-green-700 uppercase">Days Present</span>
              <h3 className="text-2xl font-bold text-green-700 mt-1">{stats.presentCount}</h3>
              <span className="text-[11px] text-green-600">On-time duty</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-amber-700 uppercase">Late Arrivals</span>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{stats.lateCount}</h3>
              <span className="text-[11px] text-amber-600">Logged tardy</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-red-700 uppercase">Unexcused Absences</span>
              <h3 className="text-2xl font-bold text-red-700 mt-1">{stats.absentCount}</h3>
              <span className="text-[11px] text-red-500">Recorded absent</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-purple-700 uppercase">Approved Leaves</span>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">{stats.approvedLeavesCount}</h3>
              <span className="text-[11px] text-purple-600">Total requests</span>
            </div>
          </div>

          {/* Profile Details Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm border-b pb-3">Staff Profile Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-3 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">Phone</span>
                  <span className="font-semibold text-gray-900">{employee.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">Email</span>
                  <span className="font-semibold text-gray-900">{employee.email || 'Not provided'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">Residential Address</span>
                  <span className="font-semibold text-gray-900">{employee.address || 'Not provided'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Building className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block">Assigned Branch</span>
                  <span className="font-semibold text-gray-900">{employee.branch?.name || 'Main Store'}</span>
                </div>
              </div>

              {isOwnerOrManager && (
                <div className="flex items-center gap-3 text-gray-700">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 block">Current Salary Baseline</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      Rs. {Number(employee.basicSalary).toLocaleString()} ({employee.salaryType.toLowerCase()})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {employee.notes && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 mt-4">
                <span className="font-bold text-gray-800 block mb-1">HR Notes:</span>
                {employee.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm">Attendance Log (Last 30 Days)</h3>
            <button
              onClick={() => setAttendanceModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Mark Log
            </button>
          </div>

          {employee.attendances.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No attendance entries recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Check-In</th>
                    <th className="px-4 py-2.5 font-medium">Check-Out</th>
                    <th className="px-4 py-2.5 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.attendances.map((att: any) => (
                    <tr key={att.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {new Date(att.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
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
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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

      {/* Tab 3: Leaves */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm">Leave History & Applications</h3>
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Request Leave
            </button>
          </div>

          {employee.leaves.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No leave applications recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Dates</th>
                    <th className="px-4 py-2.5 font-medium text-center">Days</th>
                    <th className="px-4 py-2.5 font-medium">Reason</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.leaves.map((leave: any) => (
                    <tr key={leave.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{leave.leaveType}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-900">{leave.daysCount}</td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">
                        {leave.reason}
                        {leave.approvalNotes && (
                          <span className="block text-[11px] text-blue-600 font-medium">
                            Note: {leave.approvalNotes}
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
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isOwnerOrManager && leave.status === 'PENDING' && (
                          <button
                            onClick={() => setReviewLeaveId(leave.id)}
                            className="text-xs text-blue-600 hover:underline font-semibold"
                          >
                            Review &rarr;
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

      {/* Tab 4: Salary (Protected) */}
      {activeTab === 'salary' && isOwnerOrManager && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Historical Payroll & Salary Disbursements</h3>
              <p className="text-xs text-gray-400">Exact formula: Base + Overtime + Bonus - Deductions - Advance</p>
            </div>
            <button
              onClick={() => setSalaryModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Generate Salary Record
            </button>
          </div>

          {employee.salaries.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No payroll records generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <th className="px-4 py-2.5 font-medium">Period</th>
                    <th className="px-4 py-2.5 font-medium text-right">Base</th>
                    <th className="px-4 py-2.5 font-medium text-right">OT / Bonus</th>
                    <th className="px-4 py-2.5 font-medium text-right">Deductions</th>
                    <th className="px-4 py-2.5 font-medium text-right">Net Payable</th>
                    <th className="px-4 py-2.5 font-medium text-center">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.salaries.map((sal: any) => (
                    <tr key={sal.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-mono font-bold text-gray-900">{sal.period}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                        Rs. {Number(sal.baseSalary).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                        +Rs. {(Number(sal.overtime) + Number(sal.bonus)).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                        -Rs. {(Number(sal.deductions) + Number(sal.advance)).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700 text-sm">
                        Rs. {Number(sal.netSalary).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            sal.paymentStatus === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sal.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {sal.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => setPaySalaryId({ id: sal.id, period: sal.period, netSalary: Number(sal.netSalary) })}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold"
                          >
                            Pay Now
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

      {/* Tab 5: Complaints */}
      {activeTab === 'complaints' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Workplace Feedback & Complaints</h3>
              <p className="text-xs text-gray-400">Strictly confidential to management and the submitting staff</p>
            </div>
            <button
              onClick={() => setComplaintModalOpen(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Submit Issue
            </button>
          </div>

          {employee.complaints.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No complaints or issues reported.</div>
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
                        {c.priority}
                      </span>
                      <h4 className="font-bold text-gray-900 text-xs">{c.title}</h4>
                      <span className="text-[11px] text-gray-400">({c.category})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800'
                            : c.status === 'IN_REVIEW'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>

                      {isOwnerOrManager && c.status !== 'RESOLVED' && (
                        <button
                          onClick={() => setResolveComplaintData({ id: c.id, title: c.title })}
                          className="text-xs text-blue-600 hover:underline font-semibold"
                        >
                          Resolve &rarr;
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">{c.description}</p>

                  {c.resolutionNote && (
                    <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900">
                      <span className="font-bold block text-green-950">Management Resolution:</span>
                      {c.resolutionNote}
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 block pt-1">
                    Submitted on {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Activity & Audit Trail */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b pb-3">Audit Log History</h3>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No audit events recorded.</div>
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
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals Container */}
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
