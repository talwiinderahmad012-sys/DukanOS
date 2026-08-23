'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import { createError, createSuccess, AppErrors, type ActionResponse } from '@/lib/utils/api-response';
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getYearlyReport,
  getBusinessGrowth,
  getTopSellingProducts,
  getSlowMovingProducts,
  generateBusinessReport,
  type ReportType,
  type BaseReport,
} from '@/services/reports';
import {
  generateAdvisorFindings,
  syncAdvisorNotifications,
} from '@/services/advisor';

const REPORT_PERMITTED_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
];

const PAYROLL_PERMITTED_ROLES: MembershipRole[] = [MembershipRole.OWNER];

export async function getDailyReportAction(businessId: string, dateInput?: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const report = await getDailyReport(businessId, dateInput, business.timezone);
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch daily report');
  }
}

export async function getWeeklyReportAction(businessId: string, dateInput?: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
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
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const report = await getMonthlyReport(businessId, year, month, business.timezone);
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch monthly report');
  }
}

export async function getYearlyReportAction(businessId: string, year?: number) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const report = await getYearlyReport(businessId, year, business.timezone);
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch yearly report');
  }
}

export async function getBusinessReportAction(businessId: string, type: ReportType, from: string, to: string, branchId?: string): Promise<ActionResponse<BaseReport>> {
  try {
    const permitted = type === 'PAYROLL' ? PAYROLL_PERMITTED_ROLES : REPORT_PERMITTED_ROLES;
    const { business } = await requireBusinessAccess(businessId, permitted);
    const report = await generateBusinessReport(businessId, type, {
      from: new Date(from),
      to: new Date(to),
      branchId: branchId || null,
    });
    return createSuccess(report);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to generate report') as ActionResponse<BaseReport>;
  }
}

export async function getGrowthAnalyticsAction(
  businessId: string,
  period: 'DAILY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY'
) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const growth = await getBusinessGrowth(businessId, period, business.timezone);
    return createSuccess(growth);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to fetch growth metrics');
  }
}

export async function getAdvisorReportAction(businessId: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const data = await generateAdvisorFindings(businessId, business.timezone);
    return createSuccess(data);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to generate advisor report');
  }
}

export async function triggerAdvisorScanAction(businessId: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const result = await syncAdvisorNotifications(businessId, business.timezone);
    return createSuccess(result);
  } catch (error) {
    const err = error as Error;
    return createError(AppErrors.INTERNAL_ERROR, err.message || 'Failed to sync advisor alerts');
  }
}
