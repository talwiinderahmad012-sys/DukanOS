'use server';

import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { assertOwnerOrManager } from '@/lib/auth/rbac';
import { updateBugReportStatus, updateProductFeedbackStatus } from '@/services/product-feedback';
import { BugStatus, BugSeverity, ProductFeedbackStatus } from '@/generated/prisma/client';
import { revalidatePath } from 'next/cache';

export async function triageBugReportAction(input: {
  bugId: string;
  status: string;
  severity: string;
  developerNotes?: string;
}) {
  const { membership } = await getActiveBusiness();
  // Product feedback / bug triage operate on platform-wide records and are only
  // exposed to owners/managers in the UI; enforce the same constraint here.
  assertOwnerOrManager(membership.role, 'Only owners and managers can triage platform feedback.');
  const bug = await updateBugReportStatus({
    bugId: input.bugId,
    status: input.status as BugStatus,
    severity: input.severity as BugSeverity,
    developerNotes: input.developerNotes,
  });
  revalidatePath('/dashboard/product-feedback');
  return { success: true, bug };
}

export async function triageFeatureRequestAction(input: {
  feedbackId: string;
  status: string;
  adminNotes?: string;
}) {
  const { membership } = await getActiveBusiness();
  assertOwnerOrManager(membership.role, 'Only owners and managers can triage platform feedback.');
  const feedback = await updateProductFeedbackStatus({
    feedbackId: input.feedbackId,
    status: input.status as ProductFeedbackStatus,
    adminNotes: input.adminNotes,
  });
  revalidatePath('/dashboard/product-feedback');
  return { success: true, feedback };
}
