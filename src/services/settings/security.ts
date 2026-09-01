import 'server-only';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long.');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.password) {
    throw new Error('User account not found or has no password set.');
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentValid) {
    throw new Error('Current password is incorrect.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { success: true, passHash: hashedPassword.substring(0, 10) };
}

export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    phone?: string | null;
  }
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  return updated;
}
