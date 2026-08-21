import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { ConversationType, NotificationSeverity } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';

export async function listBusinessMembersForMessaging(
  businessId: string,
  currentUserId: string
) {
  // Return all active members of the business except current user
  const memberships = await prisma.businessMembership.findMany({
    where: {
      businessId,
      userId: { not: currentUserId },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeProfiles: {
            where: { businessId },
            select: { position: true, department: true, employeeCode: true },
          },
        },
      },
    },
    orderBy: { role: 'asc' },
  });

  return memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.name || m.user.email?.split('@')[0] || 'User',
    email: m.user.email,
    role: m.role,
    position: m.user.employeeProfiles[0]?.position || null,
    employeeCode: m.user.employeeProfiles[0]?.employeeCode || null,
  }));
}

export async function getOrCreateDirectConversation(
  businessId: string,
  currentUserId: string,
  targetUserId: string
) {
  if (currentUserId === targetUserId) {
    throw new Error('Cannot start a conversation with yourself.');
  }

  // 1. Verify target user is in the same business
  const targetMembership = await prisma.businessMembership.findFirst({
    where: { businessId, userId: targetUserId },
  });

  if (!targetMembership) {
    throw new Error('Target user is not a member of this business.');
  }

  // 2. Check if direct conversation already exists between these 2 users
  const existingConversations = await prisma.conversation.findMany({
    where: {
      businessId,
      type: ConversationType.DIRECT,
      participants: {
        some: { userId: currentUserId },
      },
    },
    include: {
      participants: true,
    },
  });

  const match = existingConversations.find((c) =>
    c.participants.some((p) => p.userId === targetUserId)
  );

  if (match) {
    return match;
  }

  // 3. Create new direct conversation with both participants
  const newConversation = await prisma.conversation.create({
    data: {
      businessId,
      type: ConversationType.DIRECT,
      createdBy: currentUserId,
      participants: {
        create: [
          { userId: currentUserId, lastReadAt: new Date() },
          { userId: targetUserId, lastReadAt: new Date(0) }, // target has not read
        ],
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  await recordAuditLog({
    businessId,
    userId: currentUserId,
    action: 'CONVERSATION_CREATED',
    entityType: 'Conversation',
    entityId: newConversation.id,
    metadata: { targetUserId, type: 'DIRECT' },
  });

  return newConversation;
}

export async function listUserConversations(businessId: string, currentUserId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      businessId,
      participants: {
        some: { userId: currentUserId, isActive: true },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeProfiles: {
                where: { businessId },
                select: { position: true, employeeCode: true },
              },
            },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Calculate unread count for each conversation
  const results = await Promise.all(
    conversations.map(async (conv) => {
      const myParticipant = conv.participants.find((p) => p.userId === currentUserId);
      const otherParticipant = conv.participants.find((p) => p.userId !== currentUserId);

      const lastReadAt = myParticipant?.lastReadAt || new Date(0);

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: currentUserId },
          createdAt: { gt: lastReadAt },
          deletedAt: null,
        },
      });

      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        updatedAt: conv.updatedAt,
        otherUser: otherParticipant
          ? {
              id: otherParticipant.user.id,
              name: otherParticipant.user.name || otherParticipant.user.email?.split('@')[0] || 'User',
              email: otherParticipant.user.email,
              position: otherParticipant.user.employeeProfiles[0]?.position || null,
              employeeCode: otherParticipant.user.employeeProfiles[0]?.employeeCode || null,
            }
          : null,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
            }
          : null,
        unreadCount,
      };
    })
  );

  return results;
}

export async function getConversationMessages(
  businessId: string,
  currentUserId: string,
  conversationId: string
) {
  // 1. Verify participant belongs to this conversation and business
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: currentUserId,
      isActive: true,
      conversation: { businessId },
    },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  employeeProfiles: {
                    where: { businessId },
                    select: { position: true, employeeCode: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!participant) {
    throw new Error('Unauthorized conversation access.');
  }

  // 2. Fetch messages
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const otherParticipant = participant.conversation.participants.find(
    (p) => p.userId !== currentUserId
  );

  return {
    conversation: {
      id: participant.conversation.id,
      type: participant.conversation.type,
      title: participant.conversation.title,
      otherUser: otherParticipant
        ? {
            id: otherParticipant.user.id,
            name: otherParticipant.user.name || otherParticipant.user.email?.split('@')[0] || 'User',
            email: otherParticipant.user.email,
            position: otherParticipant.user.employeeProfiles[0]?.position || null,
          }
        : null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.name || m.sender.email?.split('@')[0] || 'User',
      content: m.content,
      createdAt: m.createdAt,
      isMe: m.senderId === currentUserId,
    })),
  };
}

export async function sendMessage(
  businessId: string,
  currentUserId: string,
  conversationId: string,
  content: string
) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Message content cannot be empty.');
  }

  // 1. Verify membership
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: currentUserId,
      isActive: true,
      conversation: { businessId },
    },
    include: {
      user: { select: { name: true, email: true } },
      conversation: {
        include: {
          participants: {
            where: { userId: { not: currentUserId } },
          },
        },
      },
    },
  });

  if (!participant) {
    throw new Error('Unauthorized or invalid conversation.');
  }

  const senderName = participant.user.name || participant.user.email?.split('@')[0] || 'A colleague';

  // 2. Create message and update conversation timestamp atomically
  const message = await prisma.$transaction(async (tx) => {
    const newMsg = await tx.message.create({
      data: {
        businessId,
        conversationId,
        senderId: currentUserId,
        content: trimmed,
      },
    });

    // Update conversation updatedAt
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Update sender's lastReadAt
    await tx.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    return newMsg;
  });

  // 3. Dispatch in-app notification to the other participant(s)
  for (const other of participant.conversation.participants) {
    await prisma.notification.create({
      data: {
        businessId,
        recipientId: other.userId,
        type: 'DIRECT_MESSAGE',
        severity: NotificationSeverity.INFO,
        title: `Message from ${senderName}`,
        message: trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed,
        isOwnerOnly: false,
        relatedEntity: 'CONVERSATION',
        relatedEntityId: conversationId,
        deduplicationKey: `${businessId}-MSG-${conversationId}-${other.userId}`,
      },
    });
  }

  return message;
}

export async function markConversationRead(
  businessId: string,
  currentUserId: string,
  conversationId: string
) {
  return prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId: currentUserId,
      conversation: { businessId },
    },
    data: {
      lastReadAt: new Date(),
    },
  });
}

export async function getUnreadMessagesCount(businessId: string, currentUserId: string): Promise<number> {
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      userId: currentUserId,
      isActive: true,
      conversation: { businessId },
    },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  if (participants.length === 0) return 0;

  let totalUnread = 0;

  for (const p of participants) {
    const unread = await prisma.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: currentUserId },
        createdAt: { gt: p.lastReadAt },
        deletedAt: null,
      },
    });
    totalUnread += unread;
  }

  return totalUnread;
}
