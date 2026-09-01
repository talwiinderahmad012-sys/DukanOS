'use server';

import { requirePlatformAdmin } from '@/lib/auth/platform-admin';
import { updateBugReportStatus, updateProductFeedbackStatus } from '@/services/product-feedback';
import { BugStatus, BugSeverity, ProductFeedbackStatus } from '@/generated/prisma/client';
import { revalidatePath } from 'next/cache';

export async function triageBugReportAction(input: {
  bugId: string;
  status: string;
  severity: string;
  developerNotes?: string;
}) {
  await requirePlatformAdmin();
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
  await requirePlatformAdmin();
  const feedback = await updateProductFeedbackStatus({
    feedbackId: input.feedbackId,
    status: input.status as ProductFeedbackStatus,
    adminNotes: input.adminNotes,
  });
  revalidatePath('/dashboard/product-feedback');
  return { success: true, feedback };
}
