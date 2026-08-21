'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Store, 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  UserCheck, 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  RefreshCw,
  Power,
  ChevronRight,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { toggleBusinessStatusAction } from '@/app/actions/monitoring.actions';

export function RemoteMonitoringView({
  businessId,
  data,
  isOwnerOrManager,
}: {
  businessId: string;
  data: any;
  isOwnerOrManager: boolean;
}) {
  const router = useRouter();
  const { business, liveSales, attendance, actionCenter } = data;

  const [isOpen, setIsOpen] = useState<boolean>(business.isOpen);
  const [operatingHours, setOperatingHours] = useState(business.operatingHours || '');
  const [toggling, setToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleToggleOpen = async () => {
    setToggling(true);
    const newStatus = !isOpen;
    const res = await toggleBusinessStatusAction(businessId, {
      isOpen: newStatus,
      operatingHours: operatingHours || undefined,
    });

    if (res.success) {
      setIsOpen(newStatus);
      router.refresh();
    }
    setToggling(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remote Business Monitoring</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitor physical store operations, live revenue, staff attendance, and critical alerts from anywhere.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Cockpit</span>
        </button>
      </div>

      {/* Row 1: Store Operating Status & Quick Toggle */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${
            isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            <Store className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{business.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`}></span>
                {isOpen ? 'Store Open & Active' : 'Store Closed'}
              </span>
            </div>

            <p className="text-xs text-gray-500">
              {operatingHours ? `Operating Hours: ${operatingHours}` : 'Operating hours not configured'} • Timezone: {business.timezone}
            </p>
          </div>
        </div>

        {isOwnerOrManager && (
          <button
            onClick={handleToggleOpen}
            disabled={toggling}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
              isOpen
                ? 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{toggling ? 'Updating...' : isOpen ? 'Set as Closed' : 'Open Store'}</span>
          </button>
        )}
      </div>

      {/* Row 2: Live Financial Performance Today */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Total Sales</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            Rs. {liveSales.totalSales.toLocaleString()}
          </h3>
          <span className="text-[11px] text-gray-400">{liveSales.orderCount} orders completed today</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Realized Gross Profit</span>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">
            Rs. {liveSales.grossProfit.toLocaleString()}
          </h3>
          <span className="text-[11px] text-emerald-600">Net after product cost deductions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Average Basket Size</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">
            Rs. {liveSales.orderCount > 0 ? Math.round(liveSales.totalSales / liveSales.orderCount).toLocaleString() : '0'}
          </h3>
          <span className="text-[11px] text-blue-500">Per order today</span>
        </div>
      </div>

      {/* Row 3: Staff Attendance Cockpit & Owner Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left (5 cols): Staff Attendance Cockpit */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-600" /> Live Staff Attendance
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {attendance.totalEmployees} Active Staff
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <span className="text-xs font-bold text-emerald-900 block">Present On-Duty</span>
              <span className="text-xl font-extrabold text-emerald-700">{attendance.presentCount}</span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl">
              <span className="text-xs font-bold text-amber-900 block">Late Arrival</span>
              <span className="text-xl font-extrabold text-amber-700">{attendance.lateCount}</span>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl">
              <span className="text-xs font-bold text-rose-900 block">Absent Today</span>
              <span className="text-xl font-extrabold text-rose-700">{attendance.absentCount}</span>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl">
              <span className="text-xs font-bold text-blue-900 block">Approved Leave</span>
              <span className="text-xl font-extrabold text-blue-700">{attendance.leaveCount}</span>
            </div>
          </div>

          {attendance.unmarkedCount > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Unrecorded Attendance:</span>
              <span className="font-bold text-gray-900">{attendance.unmarkedCount} staff members</span>
            </div>
          )}

          <div className="pt-2">
            <Link
              href="/dashboard/employees"
              className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 border border-gray-200 transition-colors"
            >
              <span>View Employee Roster</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right (7 cols): Owner Action Center */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600" /> Owner Action Center
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              actionCenter.totalActionableIssues > 0
                ? 'bg-orange-100 text-orange-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {actionCenter.totalActionableIssues > 0
                ? `${actionCenter.totalActionableIssues} Attention Needed`
                : 'All Operations Clear'}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Low Stock Alert Item */}
            {actionCenter.lowStockCount > 0 && (
              <Link
                href="/dashboard/inventory"
                className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-rose-950 block">
                      {actionCenter.lowStockCount} Products Depleted / Below Min Threshold
                    </span>
                    <span className="text-[11px] text-rose-700">Reorder stock to prevent stockouts</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:text-rose-600 transition-colors" />
              </Link>
            )}

            {/* Overdue Udhaar Alert */}
            {actionCenter.overdueCustomersCount > 0 && (
              <Link
                href="/dashboard/customers"
                className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-amber-950 block">
                      {actionCenter.overdueCustomersCount} Customers with Pending Credit (Udhaar)
                    </span>
                    <span className="text-[11px] text-amber-700">Collect outstanding receivables</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors" />
              </Link>
            )}

            {/* Pending Leave Requests */}
            {actionCenter.pendingLeavesCount > 0 && (
              <Link
                href="/dashboard/employees"
                className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-blue-950 block">
                      {actionCenter.pendingLeavesCount} Employee Leave Request(s) Awaiting Review
                    </span>
                    <span className="text-[11px] text-blue-700">Approve or reject staff leaves</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
              </Link>
            )}

            {/* Open Complaints */}
            {actionCenter.openComplaintsCount > 0 && (
              <Link
                href="/dashboard/employees"
                className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-purple-950 block">
                      {actionCenter.openComplaintsCount} Confidential Workplace Grievance(s)
                    </span>
                    <span className="text-[11px] text-purple-700">Review and resolve staff issues</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
              </Link>
            )}

            {/* Low Rating Customer Feedback */}
            {actionCenter.newLowFeedbacksCount > 0 && (
              <Link
                href="/dashboard/feedback"
                className="p-3.5 rounded-2xl border border-red-200 bg-red-50/50 hover:bg-red-50 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-red-950 block">
                      {actionCenter.newLowFeedbacksCount} Low Customer Review(s) (≤ 2★)
                    </span>
                    <span className="text-[11px] text-red-700">Investigate customer dissatisfaction</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" />
              </Link>
            )}

            {actionCenter.totalActionableIssues === 0 && (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-gray-900 text-xs">No pending operational issues!</h4>
                <p className="text-[11px] text-gray-500">
                  Stock levels are healthy, receivables are normal, and no unresolved grievances exist.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
