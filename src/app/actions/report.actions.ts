'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getYearlyReport,
  getBusinessGrowth,
  getTopSellingProducts,
  getSlowMovingProducts,
} from '@/services/reports';
import {
  generateAdvisorFindings,
  syncAdvisorNotifications,
} from '@/services/advisor';
import { createError, createSuccess, AppErrors } from '@/lib/utils/api-response';

export async function getDailyReportAction(businessId: string, dateInput?: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const report = await getDailyReport(businessId, dateInput, business.timezone);
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch daily report');
  }
}

export async function getWeeklyReportAction(businessId: string, dateInput?: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const report = await getWeeklyReport(businessId, dateInput, business.timezone);
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch weekly report');
  }
}

export async function getMonthlyReportAction(
  businessId: string,
  year?: number,
  month?: number
) {
  try {
    const { business } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const report = await getMonthlyReport(businessId, year, month, business.timezone);
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch monthly report');
  }
}

export async function getYearlyReportAction(businessId: string, year?: number) {
  try {
    const { business } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const report = await getYearlyReport(businessId, year, business.timezone);
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch yearly report');
  }
}

export async function getGrowthAnalyticsAction(
  businessId: string,
  period: 'DAILY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY'
) {
  try {
    const { business } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const growth = await getBusinessGrowth(businessId, period, business.timezone);
    return createSuccess(growth);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch growth metrics');
  }
}

export async function getAdvisorReportAction(businessId: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const data = await generateAdvisorFindings(businessId, business.timezone);
    return createSuccess(data);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to generate advisor report');
  }
}

export async function triggerAdvisorScanAction(businessId: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
    ]);

    const result = await syncAdvisorNotifications(businessId, business.timezone);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to sync advisor alerts');
  }
}
