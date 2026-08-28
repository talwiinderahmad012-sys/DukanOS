'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Save } from 'lucide-react';
import { createEmployeeAction, updateEmployeeAction } from '@/app/actions/employee.actions';
import { useTranslation } from '@/lib/i18n/language-context';

type SalaryTypeOption = 'MONTHLY' | 'DAILY' | 'HOURLY';
type EmployeeStatusOption = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'INACTIVE';

export function EmployeeForm({
  businessId,
  branches,
  initialData,
}: {
  businessId: string;
  branches: { id: string; name: string }[];
  initialData?: any;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const isEditing = !!initialData?.id;

  const [name, setName] = useState(initialData?.name || '');
  const [employeeCode, setEmployeeCode] = useState(initialData?.employeeCode || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [position, setPosition] = useState(initialData?.position || 'Cashier');
  const [department, setDepartment] = useState(initialData?.department || 'Sales');
  const [address, setAddress] = useState(initialData?.address || '');
  const [joiningDate, setJoiningDate] = useState(
    initialData?.joiningDate
      ? new Date(initialData.joiningDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [branchId, setBranchId] = useState(initialData?.branchId || (branches[0]?.id || ''));
  const [salaryType, setSalaryType] = useState<SalaryTypeOption>(initialData?.salaryType || 'MONTHLY');
  const [basicSalary, setBasicSalary] = useState(initialData?.basicSalary !== undefined ? Number(initialData.basicSalary) : 25000);
  const [status, setStatus] = useState<EmployeeStatusOption>(initialData?.status || 'ACTIVE');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      employeeCode: employeeCode.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      position,
      department: department.trim() || undefined,
      address: address.trim() || undefined,
      joiningDate,
      branchId: branchId || undefined,
      salaryType,
      basicSalary: Number(basicSalary),
      status,
      notes: notes.trim() || undefined,
    };

    let res;
    if (isEditing) {
      res = await updateEmployeeAction(businessId, initialData.id, payload);
    } else {
      res = await createEmployeeAction(businessId, payload);
    }

    if (res.success && res.data) {
      const emp = res.data as { id: string };
      router.push(`/dashboard/employees/${emp.id}`);
    } else {
      setError(tm(res.message) || t('employees.failedToSaveEmployee'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">{t('employees.sectionPersonal')}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('common.fullName')} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('employees.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.employeeCodeLabel')}</label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder={t('employees.codePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('common.phoneNumber')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('employees.phonePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.emailOptional')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('employees.emailPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">{t('common.address')}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('employees.addressPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">{t('employees.sectionPosition')}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.positionJobTitle')} *</label>
            <input
              type="text"
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t('employees.positionPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.department')}</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={t('employees.departmentPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.joiningDate')}</label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branches.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('employees.branch')}</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.employmentStatus')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatusOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="ACTIVE">{t('common.active')}</option>
              <option value="ON_LEAVE">{t('employees.statusOnLeave')}</option>
              <option value="SUSPENDED">{t('employees.statusSuspended')}</option>
              <option value="INACTIVE">{t('employees.statusArchivedInactive')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">{t('employees.sectionSalary')}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.salaryModel')}</label>
            <select
              value={salaryType}
              onChange={(e) => setSalaryType(e.target.value as SalaryTypeOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="MONTHLY">{t('employees.fixedMonthlySalary')}</option>
              <option value="DAILY">{t('employees.dailyWage')}</option>
              <option value="HOURLY">{t('employees.hourlyRate')}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">{t('employees.basicRateLabel')}</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={basicSalary}
              onChange={(e) => setBasicSalary(Number(e.target.value))}
              placeholder={t('employees.salaryPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">{t('employees.hrNotesLabel')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('employees.hrNotesPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />{' '}
          {loading ? t('common.saving') : isEditing ? t('employees.updateEmployeeButton') : t('employees.createEmployeeProfile')}
        </button>
      </div>
    </form>
  );
}
