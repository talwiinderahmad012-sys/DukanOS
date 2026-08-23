'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Clock, Calendar, Check, X } from 'lucide-react';
import { recordAttendanceAction } from '@/app/actions/employee.actions';

type AttendanceStatusOption = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'OFF_DAY';

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
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleMarkAttendance = async (employeeId: string, status: AttendanceStatusOption) => {
    setLoadingId(employeeId);
    
    // Auto-set checkIn if PRESENT or LATE
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
      alert(res.message || 'Failed to record attendance');
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Selector & Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                router.push(`/dashboard/employees/attendance?date=${e.target.value}`);
              }
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex gap-4 sm:gap-6 text-sm">
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-xs font-semibold">Total</span>
            <span className="font-bold">{initialData.summary.totalEmployees}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-600 text-xs font-semibold">Present</span>
            <span className="font-bold text-green-700">{initialData.summary.presentCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-red-600 text-xs font-semibold">Absent</span>
            <span className="font-bold text-red-700">{initialData.summary.absentCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-blue-600 text-xs font-semibold">Leave</span>
            <span className="font-bold text-blue-700">{initialData.summary.leaveCount}</span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-5 py-3.5 font-medium">Code</th>
                <th className="px-5 py-3.5 font-medium">Employee</th>
                <th className="px-5 py-3.5 font-medium">Branch</th>
                <th className="px-5 py-3.5 font-medium">Current Status</th>
                <th className="px-5 py-3.5 font-medium">Check-in / Out</th>
                <th className="px-5 py-3.5 font-medium">Quick Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialData.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    No active employees found.
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
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          ) : status === 'LATE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5" /> Late
                            </span>
                          ) : status === 'ABSENT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                              <AlertCircle className="w-3.5 h-3.5" /> Absent
                            </span>
                          ) : status === 'LEAVE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                              <Calendar className="w-3.5 h-3.5" /> On Leave
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                              {status?.replace('_', ' ')}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Unrecorded</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {attendance?.checkIn ? (
                          <div className="flex flex-col gap-0.5 text-gray-600">
                            <span>In: {new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {attendance.checkOut && (
                              <span>Out: {new Date(attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                            title="Mark Present"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(employee.id, 'ABSENT')}
                            disabled={loadingId === employee.id || (isMarked && status === 'ABSENT')}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            title="Mark Absent"
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
                            className="ml-2 py-1 px-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:opacity-50"
                          >
                            <option value="" disabled>Other...</option>
                            <option value="LATE">Late</option>
                            <option value="HALF_DAY">Half Day</option>
                            <option value="LEAVE">Leave</option>
                            <option value="OFF_DAY">Off Day</option>
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
