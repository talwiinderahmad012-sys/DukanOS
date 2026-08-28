import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { EmployeeNewClient } from './employee-new-client';

export default async function NewEmployeePage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const branches = await prisma.branch.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  });

  return <EmployeeNewClient businessId={business.id} branches={branches} />;
}
