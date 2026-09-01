'use server';

import { requireBusinessAccess } from '@/lib/auth/context';
import { MembershipRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';
import { createError, createSuccess, AppErrors, actionError, type ActionResponse, type ErrorCode } from '@/lib/utils/api-response';
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
import { AppError, ErrorCodes } from '@/lib/errors';

const REPORT_PERMITTED_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
];

const PAYROLL_PERMITTED_ROLES: MembershipRole[] = [MembershipRole.OWNER];

export async function getDailyReportAction(businessId: string, dateInput?: string, branchId?: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, businessId }, select: { id: true } });
      if (!branch) throw new AppError(ErrorCodes.BUSINESS_ACCESS_DENIED, 'Invalid branch for this business', 403);
    }
    const report = await getDailyReport(businessId, dateInput, business.timezone, branchId || undefined);
    return createSuccess(report);
  } catch (error) {
    return actionError(error, 'Failed to fetch daily report');
  }
}

export async function getWeeklyReportAction(businessId: string, dateInput?: string, branchId?: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, businessId }, select: { id: true } });
      if (!branch) throw new AppError(ErrorCodes.BUSINESS_ACCESS_DENIED, 'Invalid branch for this business', 403);
    }
    const report = await getWeeklyReport(businessId, dateInput, business.timezone, branchId || undefined);
    return createSuccess(report);
  } catch (error) {
    return actionError(error, 'Failed to fetch weekly report');
  }
}

export async function getMonthlyReportAction(
  businessId: string,
  year?: number,
  month?: number,
  branchId?: string
) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, businessId }, select: { id: true } });
      if (!branch) throw new AppError(ErrorCodes.BUSINESS_ACCESS_DENIED, 'Invalid branch for this business', 403);
    }
    const report = await getMonthlyReport(businessId, year, month, business.timezone, branchId || undefined);
    return createSuccess(report);
  } catch (error) {
    return actionError(error, 'Failed to fetch monthly report');
  }
}

export async function getYearlyReportAction(businessId: string, year?: number, branchId?: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, businessId }, select: { id: true } });
      if (!branch) throw new AppError(ErrorCodes.BUSINESS_ACCESS_DENIED, 'Invalid branch for this business', 403);
    }
    const report = await getYearlyReport(businessId, year, business.timezone, branchId || undefined);
    return createSuccess(report);
  } catch (error) {
    return actionError(error, 'Failed to fetch yearly report');
  }
}

export async function getBusinessReportAction(businessId: string, type: ReportType, from: string, to: string, branchId?: string): Promise<ActionResponse<BaseReport>> {
  try {
    const permitted = type === 'PAYROLL' ? PAYROLL_PERMITTED_ROLES : REPORT_PERMITTED_ROLES;
    const { business } = await requireBusinessAccess(businessId, permitted);

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, businessId }, select: { id: true } });
      if (!branch) throw new AppError(ErrorCodes.BUSINESS_ACCESS_DENIED, 'Invalid branch for this business', 403);
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    // Date-only "to" values parse as UTC midnight; extend to end of day so the
    // selected end date is fully included in the report range.
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const endOfDay = Date.parse(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(endOfDay)) toDate.setTime(endOfDay);
    }

    const report = await generateBusinessReport(businessId, type, {
      from: fromDate,
      to: toDate,
      branchId: branchId || null,
      timezone: business.timezone,
    });
    return createSuccess(report);
  } catch (error) {
    if (error instanceof AppError) {
      return createError(error.code as ErrorCode, error.message) as ActionResponse<BaseReport>;
    }
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
    return actionError(error, 'Failed to fetch growth metrics');
  }
}

export async function getAdvisorReportAction(businessId: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const data = await generateAdvisorFindings(businessId, business.timezone);
    return createSuccess(data);
  } catch (error) {
    return actionError(error, 'Failed to generate advisor report');
  }
}

export async function triggerAdvisorScanAction(businessId: string) {
  try {
    const { business } = await requireBusinessAccess(businessId, REPORT_PERMITTED_ROLES);
    const result = await syncAdvisorNotifications(businessId, business.timezone);
    return createSuccess(result);
  } catch (error) {
    return actionError(error, 'Failed to sync advisor alerts');
  }
}
