import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { 
  CommunicationChannel, 
  DeliveryStatus 
} from '@/generated/prisma/client';
import { recordAuditLog } from './audit';

/**
 * 1. Provider Status
 */
export async function getProviderStatus(businessId: string, channel: CommunicationChannel) {
  const config = await prisma.communicationProviderConfig.findFirst({
    where: { businessId, channel },
  });
  
  if (!config) {
    return { configured: false, provider: null };
  }
  return { configured: config.isEnabled, provider: config.provider };
}

/**
 * 2. Send Message (Stub since we don't have real provider implementations yet)
 */
export async function sendCustomerMessage(
  businessId: string,
  userId: string,
  customerId: string,
  data: {
    channel: CommunicationChannel;
    messageType: string;
    templateType?: string | null;
    content: string;
    metadata?: any;
  }
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId }
  });

  if (!customer) {
    throw new Error('Customer not found or unauthorized.');
  }

  // Check if provider is configured
  const status = await getProviderStatus(businessId, data.channel);
  
  let deliveryStatus: DeliveryStatus = DeliveryStatus.QUEUED;
  let errorMsg = null;

  if (!status.configured) {
    deliveryStatus = DeliveryStatus.FAILED;
    errorMsg = `Provider for ${data.channel} is not configured.`;
  }

  const message = await prisma.communicationMessage.create({
    data: {
      businessId,
      customerId,
      recipient: customer.phone || customer.email || 'UNKNOWN',
      recipientName: customer.name,
      channel: data.channel,
      messageType: data.messageType,
      templateType: data.templateType,
      body: data.content,
      status: deliveryStatus,
      failureReason: errorMsg,
    }
  });

  await recordAuditLog({
    businessId,
    userId,
    action: 'SEND_CUSTOMER_MESSAGE',
    entityType: 'CommunicationMessage',
    entityId: message.id,
    metadata: {
      customerId,
      channel: data.channel,
      status: deliveryStatus,
    }
  });

  return message;
}

/**
 * 3. List Communication Logs
 */
export async function listCommunicationLogs(
  businessId: string,
  filters: {
    customerId?: string;
    channel?: CommunicationChannel;
    status?: DeliveryStatus;
    page?: number;
    limit?: number;
  }
) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = { businessId };
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.channel) where.channel = filters.channel;
  if (filters.status) where.status = filters.status;

  const [total, messages] = await Promise.all([
    prisma.communicationMessage.count({ where }),
    prisma.communicationMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true } }
      }
    })
  ]);

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * 4. List Templates
 */
export async function listMessageTemplates(businessId: string) {
  return prisma.messageTemplate.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * 5. Create Template
 */
export async function createMessageTemplate(
  businessId: string,
  data: {
    type: string;
    channel: CommunicationChannel;
    name: string;
    subject?: string | null;
    body: string;
    isEnabled?: boolean;
    isDefault?: boolean;
  }
) {
  return prisma.messageTemplate.create({
    data: {
      businessId,
      type: data.type,
      channel: data.channel,
      name: data.name,
      subject: data.subject,
      body: data.body,
      isEnabled: data.isEnabled ?? true,
      isDefault: data.isDefault ?? false,
    }
  });
}

/**
 * 6. Automations
 */
export async function listMessageAutomations(businessId: string) {
  return prisma.messageAutomation.findMany({
    where: { businessId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function toggleMessageAutomation(
  businessId: string,
  automationId: string,
  isEnabled: boolean
) {
  return prisma.messageAutomation.update({
    where: { id: automationId, businessId },
    data: { isEnabled }
  });
}
