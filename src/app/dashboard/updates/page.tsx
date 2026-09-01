import { requireActiveBusiness } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { UpdatesPageClient } from './updates-client';

export const metadata: Metadata = {
  title: 'Product Updates & Changelog | DukaanOS',
  description: 'Recent feature releases, improvements, and system updates for DukaanOS.',
};

export default async function UpdatesPage() {
  const { membership } = await requireActiveBusiness();

  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  return <UpdatesPageClient />;
}
