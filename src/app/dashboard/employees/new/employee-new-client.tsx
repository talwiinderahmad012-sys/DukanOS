'use client';

import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '@/components/employees/employee-form';
import { useTranslation } from '@/lib/i18n/language-context';

export function EmployeeNewClient({
  businessId,
  branches,
}: {
  businessId: string;
  branches: { id: string; name: string }[];
}) {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/employees"
          className="hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4 rtl-flip" /> {t('employees.staffDirectory')}
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400 rtl-flip" />
        <span className="text-gray-900 font-semibold">{t('employees.newEmployeeRegistration')}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('employees.addNewStaffMember')}</h1>
        <p className="text-xs text-gray-500 mt-1">{t('employees.newEmployeeDescription')}</p>
      </div>

      <EmployeeForm businessId={businessId} branches={branches} />
    </div>
  );
}
