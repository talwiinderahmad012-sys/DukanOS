import { requireActiveBusiness } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { ProfileSecurityView } from '@/components/settings/profile-security-view';
import { redirect } from 'next/navigation';

export default async function SecuritySettingsPage() {
  const { user } = await requireActiveBusiness();

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="py-2">
      <ProfileSecurityView initialUser={currentUser} initialTab="SECURITY" />
    </div>
  );
}
