'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  listCommunicationLogs,
  listMessageTemplates,
  createMessageTemplate,
  listMessageAutomations,
  toggleMessageAutomation,
  sendCustomerMessage,
  getProviderStatus,
} from '@/services/customer-communications';
import {
  createMessageTemplateSchema,
  toggleAutomationSchema,
  sendCustomerMessageSchema,
} from '@/lib/validations';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

export async function listCommunicationLogsAction(businessId: string, filters: any = {}) {
  try {
    await requireBusinessAccess(businessId);
    const data = await listCommunicationLogs(businessId, filters);
    return createSuccess(data);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list logs');
  }
}

export async function listMessageTemplatesAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId);
    const data = await listMessageTemplates(businessId);
    return createSuccess(data);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list templates');
  }
}

export async function createMessageTemplateAction(businessId: string, payload: unknown) {
  try {
    await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);
    const validated = createMessageTemplateSchema.safeParse(payload);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid template input data', validated.error.flatten().fieldErrors);
    }
    const template = await createMessageTemplate(businessId, validated.data);
    return createSuccess(template);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to create template');
  }
}

export async function listMessageAutomationsAction(businessId: string) {
  try {
    await requireBusinessAccess(businessId);
    const data = await listMessageAutomations(businessId);
    return createSuccess(data);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to list automations');
  }
}

export async function toggleMessageAutomationAction(businessId: string, payload: unknown) {
  try {
    await requireBusinessAccess(businessId, [MembershipRole.OWNER, MembershipRole.MANAGER]);
    const validated = toggleAutomationSchema.safeParse(payload);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid toggle automation payload', validated.error.flatten().fieldErrors);
    }
    const result = await toggleMessageAutomation(businessId, validated.data.automationId, validated.data.isEnabled);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to toggle automation');
  }
}

export async function sendCustomerMessageAction(businessId: string, payload: unknown) {
  try {
    const { user } = await requireBusinessAccess(businessId);
    const validated = sendCustomerMessageSchema.safeParse(payload);
    if (!validated.success) {
      return createError(AppErrors.VALIDATION_ERROR, 'Invalid message payload', validated.error.flatten().fieldErrors);
    }
    const result = await sendCustomerMessage(businessId, user.id, validated.data.customerId, validated.data);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to send message');
  }
}

export async function getProviderStatusAction(businessId: string, channel: any) {
  try {
    await requireBusinessAccess(businessId);
    const status = await getProviderStatus(businessId, channel);
    return createSuccess(status);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch provider status');
  }
}
