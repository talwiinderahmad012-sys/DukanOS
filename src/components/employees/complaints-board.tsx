'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquareWarning, Clock, CheckCircle2, ShieldCheck, AlertOctagon } from 'lucide-react';
import { resolveComplaintAction } from '@/app/actions/employee.actions';

export function ComplaintsBoard({
  businessId,
  initialData,
  currentStatus,
}: {
  businessId: string;
  initialData: any;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleResolve = async (complaintId: string, status: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED') => {
    const notes = prompt(`Enter resolution notes for marking as ${status.replace('_', ' ')}:`);
    if (notes === null) return; // cancelled by user

    setLoadingId(complaintId);
    const res = await resolveComplaintAction(businessId, {
      complaintId,
      status,
      resolutionNote: notes
    });
    
    setLoadingId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.message || `Failed to update complaint`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED'].map((status) => (
          <button
            key={status}
            onClick={() => router.push(`/dashboard/employees/complaints?status=${status}`)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              currentStatus === status 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status === 'ALL' ? 'All Complaints' : status.replace('_', ' ').charAt(0) + status.replace('_', ' ').slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-5 py-3.5 font-medium">Employee</th>
                <th className="px-5 py-3.5 font-medium">Complaint Details</th>
                <th className="px-5 py-3.5 font-medium">Priority</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialData.complaints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No complaints found.
                  </td>
                </tr>
              ) : (
                initialData.complaints.map((c: any) => {
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 block">{c.employee.name}</span>
                        <span className="text-[11px] text-gray-400 font-mono">{c.employee.employeeCode}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className="font-bold text-gray-800 block mb-0.5">{c.title}</span>
                        <span className="text-gray-500 line-clamp-2 max-w-sm">{c.description}</span>
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          c.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                          c.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          c.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.status === 'OPEN' ? 'bg-amber-100 text-amber-800' :
                          c.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-800' :
                          c.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                          c.status === 'CLOSED' ? 'bg-gray-200 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {c.status === 'OPEN' && <AlertOctagon className="w-3.5 h-3.5" />}
                          {c.status === 'IN_REVIEW' && <Clock className="w-3.5 h-3.5" />}
                          {c.status === 'RESOLVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {c.status === 'CLOSED' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {c.status.replace('_', ' ')}
                        </span>
                        {c.resolutionNote && (
                          <span className="block text-[10px] text-gray-400 mt-1 truncate max-w-[150px]" title={c.resolutionNote}>
                            Note: {c.resolutionNote}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {(c.status === 'OPEN' || c.status === 'IN_REVIEW') && (
                          <div className="flex flex-col sm:flex-row items-end justify-end gap-1.5">
                            {c.status === 'OPEN' && (
                              <button
                                onClick={() => handleResolve(c.id, 'IN_REVIEW')}
                                disabled={loadingId === c.id}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                              >
                                Review
                              </button>
                            )}
                            <button
                              onClick={() => handleResolve(c.id, 'RESOLVED')}
                              disabled={loadingId === c.id}
                              className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleResolve(c.id, 'REJECTED')}
                              disabled={loadingId === c.id}
                              className="px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                              Reject
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
            Page {initialData.pagination.page} of {initialData.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            {initialData.pagination.page > 1 && (
              <button 
                onClick={() => router.push(`/dashboard/employees/complaints?status=${currentStatus}&page=${initialData.pagination.page - 1}`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {initialData.pagination.page < initialData.pagination.totalPages && (
              <button 
                onClick={() => router.push(`/dashboard/employees/complaints?status=${currentStatus}&page=${initialData.pagination.page + 1}`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
