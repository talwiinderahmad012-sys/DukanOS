'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  ArrowLeft, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Phone
} from 'lucide-react';
import { 
  updateMemberRoleAction, 
  removeMemberAction, 
  attachMemberAction 
} from '@/app/actions/settings.actions';

export function MembersView({
  businessId,
  initialMembers,
  currentUserId,
}: {
  businessId: string;
  initialMembers: any[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>(initialMembers);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('CASHIER');
  const [inviting, setInviting] = useState(false);

  // Action status
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateMemberRoleAction(businessId, {
      targetUserId,
      newRole: newRole as any,
    });

    if (res.success) {
      setSuccessMsg('Member role updated.');
      setMembers((prev) =>
        prev.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m))
      );
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from this business?`)) {
      return;
    }

    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await removeMemberAction(businessId, targetUserId);
    if (res.success) {
      setSuccessMsg('Member removed from business.');
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to remove member.');
    }
  };

  const handleAttachMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await attachMemberAction(businessId, {
      email: inviteEmail.trim(),
      role: inviteRole as any,
    });

    if (res.success) {
      setSuccessMsg(`User ${inviteEmail} successfully attached as ${inviteRole}.`);
      setShowInviteModal(false);
      setInviteEmail('');
      router.refresh();
    } else {
      setErrorMsg(res.message || 'Failed to add member.');
    }
    setInviting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Team & Business Roles</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage who has access to this business and assign roles with strict owner protection.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <span className="text-xs font-bold text-gray-700">Team Roster ({members.length})</span>
          <span className="text-[11px] text-gray-400 font-mono">
            {members.filter((m) => m.role === 'OWNER').length} Owner(s)
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;

            return (
              <div
                key={m.id}
                className="p-4 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{m.userName}</span>
                    {isSelf && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span>{m.userEmail}</span>
                    </span>
                    {m.userPhone && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{m.userPhone}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      m.role === 'OWNER'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : m.role === 'MANAGER'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : m.role === 'CASHIER'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="STAFF">STAFF</option>
                  </select>

                  <button
                    onClick={() => handleRemoveMember(m.userId, m.userName)}
                    title="Remove member"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Attach User */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Add Member by Email</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAttachMember} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">Registered User Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-gray-400">
                  User must already have an account created on DukaanOS.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">Initial Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="CASHIER">CASHIER (POS Checkout only)</option>
                  <option value="MANAGER">MANAGER (Inventory & Reports)</option>
                  <option value="STAFF">STAFF (Attendance & Leaves)</option>
                  <option value="OWNER">OWNER (Full Co-Ownership)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Attaching...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
