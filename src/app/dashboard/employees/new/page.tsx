import { requireActiveBusiness } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { EmployeeNewClient } from './employee-new-client';

export default async function NewEmployeePage() {
  const { business } = await requireActiveBusiness();

  const branches = await prisma.branch.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  });

  return <EmployeeNewClient businessId={business.id} branches={branches} />;
}
