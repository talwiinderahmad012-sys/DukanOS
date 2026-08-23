import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { MembershipRole } from '@/generated/prisma/client';
import { recordAuditLog } from '../audit';

export async function listBusinessMembers(businessId: string) {
  const memberships = await prisma.businessMembership.findMany({
    where: { businessId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  return memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    userName: m.user.name,
    userEmail: m.user.email,
    userPhone: m.user.phone,
    role: m.role,
    joinedAt: m.createdAt,
  }));
}

export async function updateMemberRole(
  businessId: string,
  actorUserId: string,
  targetUserId: string,
  newRole: MembershipRole
) {
  // 1. Verify actor has OWNER role
  const actorMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: actorUserId,
        businessId,
      },
    },
  });

  if (!actorMembership || actorMembership.role !== MembershipRole.OWNER) {
    throw new Error('Only a business owner can modify member roles.');
  }

  // 2. Fetch target membership
  const targetMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: targetUserId,
        businessId,
      },
    },
  });

  if (!targetMembership) {
    throw new Error('Member not found in this business.');
  }

  // 3. Owner Protection Rule: Cannot demote the last active owner
  if (targetMembership.role === MembershipRole.OWNER && newRole !== MembershipRole.OWNER) {
    const ownerCount = await prisma.businessMembership.count({
      where: {
        businessId,
        role: MembershipRole.OWNER,
      },
    });

    if (ownerCount <= 1) {
      throw new Error('Cannot demote the sole owner of the business. Transfer ownership first.');
    }
  }

  const updated = await prisma.businessMembership.update({
    where: { id: targetMembership.id },
    data: { role: newRole },
  });

  await recordAuditLog({
    businessId,
    userId: actorUserId,
    action: 'MEMBER_ROLE_UPDATED',
    entityType: 'BusinessMembership',
    entityId: updated.id,
    metadata: { targetUserId, oldRole: targetMembership.role, newRole },
  });

  return updated;
}

export async function removeMember(
  businessId: string,
  actorUserId: string,
  targetUserId: string
) {
  // 1. Verify actor is OWNER
  const actorMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: actorUserId,
        businessId,
      },
    },
  });

  if (!actorMembership || actorMembership.role !== MembershipRole.OWNER) {
    throw new Error('Only a business owner can remove members.');
  }

  // 2. Fetch target membership
  const targetMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: targetUserId,
        businessId,
      },
    },
  });

  if (!targetMembership) {
    throw new Error('Member not found in this business.');
  }

  // 3. Owner Protection Rule: Cannot remove the last active owner
  if (targetMembership.role === MembershipRole.OWNER) {
    const ownerCount = await prisma.businessMembership.count({
      where: {
        businessId,
        role: MembershipRole.OWNER,
      },
    });

    if (ownerCount <= 1) {
      throw new Error('Cannot remove the sole owner of the business.');
    }
  }

  await prisma.businessMembership.delete({
    where: { id: targetMembership.id },
  });

  await recordAuditLog({
    businessId,
    userId: actorUserId,
    action: 'MEMBER_REMOVED',
    entityType: 'BusinessMembership',
    entityId: targetMembership.id,
    metadata: { targetUserId, role: targetMembership.role },
  });

  return { success: true };
}

export async function attachUserToBusiness(
  businessId: string,
  actorUserId: string,
  email: string,
  role: MembershipRole
) {
  const actorMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: actorUserId,
        businessId,
      },
    },
  });

  if (!actorMembership || actorMembership.role !== MembershipRole.OWNER) {
    throw new Error('Only a business owner can add members.');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    throw new Error(`User with email "${email}" does not have a registered DukaanOS account.`);
  }

  const existingMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: user.id,
        businessId,
      },
    },
  });

  if (existingMembership) {
    throw new Error('This user is already a member of this business.');
  }

  const newMembership = await prisma.businessMembership.create({
    data: {
      businessId,
      userId: user.id,
      role,
    },
  });

  await recordAuditLog({
    businessId,
    userId: actorUserId,
    action: 'MEMBER_ATTACHED',
    entityType: 'BusinessMembership',
    entityId: newMembership.id,
    metadata: { addedUserId: user.id, email: user.email, role },
  });

  return newMembership;
}
