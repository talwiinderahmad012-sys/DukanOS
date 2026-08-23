import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { ProfileSecurityView } from '@/components/settings/profile-security-view';
import { redirect } from 'next/navigation';

export default async function ProfileSettingsPage() {
  const { user } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="py-2">
      <ProfileSecurityView initialUser={currentUser} initialTab="PROFILE" />
    </div>
  );
}
