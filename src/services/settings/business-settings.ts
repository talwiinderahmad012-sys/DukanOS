import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { BILINGUAL_MODEL_FIELDS, resolveBilingualUpdate } from '@/lib/translation/bilingual';

export async function getOrCreateBusinessSettings(businessId: string) {
  let settings = await prisma.businessSetting.findUnique({ where: { businessId } });
  if (!settings) {
    settings = await prisma.businessSetting.create({ data: { businessId } });
  }
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  return { business, settings };
}

export async function updateBusinessProfile(businessId: string, data: { name: string; phone?: string; district?: string; province?: string; website?: string; description?: string; logoUrl?: string; type?: any }) {
  const existing = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, description: true, nameEn: true, nameUr: true, descriptionEn: true, descriptionUr: true }
  });

  // Only human-readable profile content (name/description) is bilingual.
  // Identifiers such as phone/website/coordinates are never translated.
  const bilingual = existing
    ? await resolveBilingualUpdate(
        existing,
        { name: data.name, description: data.description },
        BILINGUAL_MODEL_FIELDS.business
      )
    : { data: {}, failedFields: [] };

  await prisma.business.update({
    where: { id: businessId },
    data: { name: data.name, phone: data.phone, district: data.district, province: data.province, website: data.website, description: data.description, type: data.type, ...bilingual.data }
  });

  if (data.logoUrl !== undefined) {
    await prisma.businessSetting.upsert({
      where: { businessId },
      update: { logoUrl: data.logoUrl },
      create: { businessId, logoUrl: data.logoUrl }
    });
  }
  return true;
}

export async function updateSalesSettings(businessId: string, data: { invoicePrefix: string; invoiceStartingNumber: number; allowPriceOverride?: boolean; autoPrintReceipt?: boolean; defaultPaymentMethod?: string }) {
  let prefix = data.invoicePrefix.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 10);
  return prisma.businessSetting.update({
    where: { businessId },
    data: {
      invoicePrefix: prefix, invoiceStartingNumber: data.invoiceStartingNumber,
      allowPriceOverride: data.allowPriceOverride, autoPrintReceipt: data.autoPrintReceipt, defaultPaymentMethod: data.defaultPaymentMethod
    }
  });
}

export async function updateAdvisorSettings(businessId: string, data: { advisorRuleLowStock?: boolean; advisorRuleSlowMoving?: boolean; advisorRuleSalesDecline?: boolean; advisorRuleProfitDecline?: boolean; advisorRuleCreditRisk?: boolean; advisorRuleExpenseSpike?: boolean; }) {
  return prisma.businessSetting.update({ where: { businessId }, data });
}

export async function updateReceiptSettings(businessId: string, data: { receiptHeader?: string; receiptFooter?: string; showFeedbackQr?: boolean; showTaxNumber?: boolean; taxNumber?: string }) {
  return prisma.businessSetting.update({ where: { businessId }, data });
}

export async function updateInvoiceDisplaySettings(businessId: string, data: { invoiceFooter?: string; showLogoOnInvoice?: boolean; showPaymentMethodOnInvoice?: boolean; showDueAmountOnInvoice?: boolean; showCashierNameOnInvoice?: boolean; showBranchInfoOnInvoice?: boolean; showCustomerInfoOnInvoice?: boolean }) {
  return prisma.businessSetting.update({ where: { businessId }, data });
}

export async function updateInventorySettings(businessId: string, data: { criticalStockThreshold?: number; requireStockAdjustmentReason?: boolean; enableLowStockNotifications?: boolean }) {
  return prisma.businessSetting.update({ where: { businessId }, data });
}

export async function getNextInvoiceNumber(businessId: string, tx?: any): Promise<string> {
  const client = tx || prisma;
  const rows: Array<{ counter: number; prefix: string; startNum: number }> = await client.$queryRaw`
    UPDATE "public"."BusinessSetting"
    SET "invoiceCounter" = "invoiceCounter" + 1, "updatedAt" = NOW()
    WHERE "businessId" = ${businessId}::text
    RETURNING "invoiceCounter" AS counter, "invoicePrefix" AS prefix, "invoiceStartingNumber" AS "startNum"
  `;
  if (!rows?.length) return 'INV-001001';
  const { counter, prefix, startNum } = rows[0];
  const sequenceNumber = (startNum || 1001) + counter - 1;
  return `${prefix}${String(sequenceNumber).padStart(6, '0')}`;
}

export async function listBranches(businessId: string) {
  return prisma.branch.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } });
}

export async function createBranch(businessId: string, data: { name: string; code: string; address?: string; phone?: string; email?: string }) {
  return prisma.branch.create({
    data: { name: data.name, code: data.code, address: data.address, phone: data.phone, email: data.email, businessId, status: 'ACTIVE' }
  });
}

export async function updateBranch(businessId: string, branchId: string, data: { name?: string; code?: string; address?: string; phone?: string; email?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
  return prisma.branch.update({ where: { id: branchId, businessId }, data });
}

export async function deactivateBranch(businessId: string, branchId: string) {
  const activeCount = await prisma.branch.count({ where: { businessId, status: 'ACTIVE' } });
  if (activeCount <= 1) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (branch?.status === 'ACTIVE') throw new Error('Cannot deactivate the last active branch.');
  }
  return prisma.branch.update({ where: { id: branchId, businessId }, data: { status: 'INACTIVE' } });
}

export async function reactivateBranch(businessId: string, branchId: string) {
  return prisma.branch.update({ where: { id: branchId, businessId }, data: { status: 'ACTIVE' } });
}
