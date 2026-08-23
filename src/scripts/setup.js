const fs = require('fs');
const path = require('path');

const basePath = 'd:\\\\DukanOS';

function write(file, content) {
  const fullPath = path.join(basePath, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('Wrote ' + file);
}

write('src/services/settings/business-settings.ts', `import 'server-only';
import { prisma } from '@/lib/db/prisma';

export async function getOrCreateBusinessSettings(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      settings: true,
    }
  });

  if (!business) {
    throw new Error('Business not found');
  }

  if (business.settings) {
    return { business, settings: business.settings };
  }

  const settings = await prisma.businessSetting.create({
    data: {
      businessId,
      invoiceCounter: 0,
      invoicePrefix: 'INV-',
      invoiceStartingNumber: 1001,
      invoiceFooter: '',
      showLogoOnInvoice: false,
      showPaymentMethodOnInvoice: true,
      showDueAmountOnInvoice: true,
      showCashierNameOnInvoice: true,
      showBranchInfoOnInvoice: true,
      showCustomerInfoOnInvoice: true,
      allowPriceOverride: false,
      autoPrintReceipt: false,
      defaultPaymentMethod: 'CASH',
      criticalStockThreshold: 2,
      requireStockAdjustmentReason: true,
      enableLowStockNotifications: true,
    }
  });

  return { business, settings };
}

export async function updateBusinessProfile(businessId: string, data: { name: string; phone?: string; email?: string; address?: string; city?: string; country?: string; timezone?: string; currency?: string; currencySymbol?: string; currencyPosition?: 'LEFT' | 'RIGHT'; district?: string; province?: string; website?: string; description?: string; type?: string; logoUrl?: string }) {
  const updateData: any = { ...data };
  return prisma.business.update({
    where: { id: businessId },
    data: updateData
  });
}

export async function updateSalesSettings(businessId: string, data: { invoicePrefix: string; invoiceStartingNumber: number; allowPriceOverride?: boolean; autoPrintReceipt?: boolean; defaultPaymentMethod?: string }) {
  let prefix = data.invoicePrefix.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 10);
  return prisma.businessSetting.update({
    where: { businessId },
    data: {
      invoicePrefix: prefix,
      invoiceStartingNumber: data.invoiceStartingNumber,
      allowPriceOverride: data.allowPriceOverride,
      autoPrintReceipt: data.autoPrintReceipt,
      defaultPaymentMethod: data.defaultPaymentMethod
    }
  });
}

export async function updateAdvisorSettings(businessId: string, data: { enableAIAdvisor: boolean; advisorPersonality: string; advisorLanguage: string }) {
  return prisma.businessSetting.update({
    where: { businessId },
    data
  });
}

export async function updateReceiptSettings(businessId: string, data: { receiptHeader: string; receiptFooter: string; showStoreName: boolean; showStoreAddress: boolean; showStorePhone: boolean }) {
  return prisma.businessSetting.update({
    where: { businessId },
    data
  });
}

export async function updateInvoiceDisplaySettings(businessId: string, data: { invoiceFooter?: string; showLogoOnInvoice?: boolean; showPaymentMethodOnInvoice?: boolean; showDueAmountOnInvoice?: boolean; showCashierNameOnInvoice?: boolean; showBranchInfoOnInvoice?: boolean; showCustomerInfoOnInvoice?: boolean }) {
  return prisma.businessSetting.update({
    where: { businessId },
    data
  });
}

export async function updateInventorySettings(businessId: string, data: { criticalStockThreshold?: number; requireStockAdjustmentReason?: boolean; enableLowStockNotifications?: boolean }) {
  return prisma.businessSetting.update({
    where: { businessId },
    data
  });
}

export async function getNextInvoiceNumber(businessId: string, tx?: any): Promise<string> {
  const client = tx || prisma;
  const rows: Array<{ counter: number; prefix: string; startNum: number }> = await client.$queryRaw\`
    UPDATE "public"."BusinessSetting"
    SET "invoiceCounter" = "invoiceCounter" + 1, "updatedAt" = NOW()
    WHERE "businessId" = \${businessId}::text
    RETURNING "invoiceCounter" AS counter, "invoicePrefix" AS prefix, "invoiceStartingNumber" AS "startNum"
  \`;
  if (!rows?.length) {
    return 'INV-001001';
  }
  const { counter, prefix, startNum } = rows[0];
  const sequenceNumber = (startNum || 1001) + counter - 1;
  return \`\${prefix}\${String(sequenceNumber).padStart(6, '0')}\`;
}

export async function listBranches(businessId: string) {
  return prisma.branch.findMany({
    where: { businessId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function createBranch(businessId: string, data: { name: string; code: string; type: string; address?: string; phone?: string; email?: string }) {
  return prisma.branch.create({
    data: {
      ...data,
      businessId,
      status: 'ACTIVE'
    }
  });
}

export async function updateBranch(businessId: string, branchId: string, data: { name: string; code: string; type: string; address?: string; phone?: string; email?: string; status?: string }) {
  return prisma.branch.update({
    where: { id: branchId, businessId },
    data
  });
}

export async function deactivateBranch(businessId: string, branchId: string) {
  const activeCount = await prisma.branch.count({
    where: { businessId, status: 'ACTIVE' }
  });
  if (activeCount <= 1) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (branch?.status === 'ACTIVE') {
      throw new Error('Cannot deactivate the last active branch.');
    }
  }
  return prisma.branch.update({
    where: { id: branchId, businessId },
    data: { status: 'INACTIVE' }
  });
}

export async function reactivateBranch(businessId: string, branchId: string) {
  return prisma.branch.update({
    where: { id: branchId, businessId },
    data: { status: 'ACTIVE' }
  });
}
`);
