import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listEmployees, getEmployeeDashboardStats } from '@/services/employees';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquareWarning, 
  Search, 
  Filter,
  ChevronRight,
  ShieldCheck,
  Building
} from 'lucide-react';

export default async function EmployeesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    branchId?: string;
    position?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const search = params.search;
  const status = (params.status || 'ALL') as any;

  const [stats, data] = await Promise.all([
    getEmployeeDashboardStats(business.id),
    listEmployees(business.id, {
      search,
      status,
      page,
      limit: 25,
    }),
  ]);

  const { employees, pagination } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff & Employee Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage employee records, daily attendance, leaves, payroll history, and staff complaints.
          </p>
        </div>

        <Link
          href="/dashboard/employees/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" /> Add New Employee
        </Link>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Staff</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</h3>
          <span className="text-[11px] text-gray-400">{stats.activeEmployees} active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-green-700 uppercase">Present Today</span>
          <h3 className="text-2xl font-bold text-green-700 mt-1">{stats.presentToday}</h3>
          <span className="text-[11px] text-green-600">On duty</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-red-700 uppercase">Absent Today</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">{stats.absentToday}</h3>
          <span className="text-[11px] text-red-500">Unexcused</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase">Pending Leaves</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">{stats.pendingLeaves}</h3>
          <span className="text-[11px] text-blue-500">Awaiting approval</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase">Complaints</span>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{stats.openComplaints}</h3>
          <span className="text-[11px] text-amber-600">In review</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
        <form method="GET" className="relative flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search by name, employee code, phone, position..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Staff</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Archived / Inactive</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {employees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No staff members found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Add your store cashiers, sales associates, and managers to track attendance, leaves, and payroll records.
            </p>
            <Link
              href="/dashboard/employees/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add First Employee
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-5 py-3.5 font-medium">Code</th>
                  <th className="px-5 py-3.5 font-medium">Employee</th>
                  <th className="px-5 py-3.5 font-medium">Position & Dept</th>
                  <th className="px-5 py-3.5 font-medium">Today's Attendance</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  const todayStatus = emp.todayAttendance?.status;

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
                          className="font-bold text-gray-900 hover:text-blue-600 transition-colors block"
                        >
                          {emp.name}
                        </Link>
                        <span className="text-xs text-gray-400 font-mono">{emp.phone || 'No phone'}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800 text-xs">{emp.position}</p>
                        {emp.department && (
                          <span className="text-[11px] text-gray-400 block">{emp.department}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {todayStatus === 'PRESENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Present
                          </span>
                        ) : todayStatus === 'LATE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Late
                          </span>
                        ) : todayStatus === 'ABSENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            <AlertCircle className="w-3.5 h-3.5" /> Absent
                          </span>
                        ) : todayStatus === 'LEAVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            <Calendar className="w-3.5 h-3.5" /> On Leave
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Not marked today</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : emp.status === 'ON_LEAVE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : emp.status === 'SUSPENDED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {emp.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/dashboard/employees/${emp.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-end gap-0.5"
                        >
                          View Profile <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total staff)
            </span>
            <div className="flex gap-1">
              {pagination.page > 1 && (
                <Link
                  href={`/dashboard/employees?page=${pagination.page - 1}`}
                  className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                >
                  Previous
                </Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={`/dashboard/employees?page=${pagination.page + 1}`}
                  className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
