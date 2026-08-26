export {};

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  const { prisma } = await import('@/lib/db/prisma');
  const { getOrCreateBusinessSettings, updateBusinessProfile, deactivateBranch, createBranch, updateInvoiceDisplaySettings, getNextInvoiceNumber, updateInventorySettings, updateSalesSettings } = await import('@/services/settings/business-settings');

  const business = await prisma.business.findFirst();
  if (!business) return console.log('No business found');
  
  console.log('Testing getOrCreateBusinessSettings');
  const res1 = await getOrCreateBusinessSettings(business.id);
  console.log(res1.settings);
  
  console.log('Testing updateBusinessProfile');
  await updateBusinessProfile(business.id, { name: 'Test', district: 'Central', province: 'Punjab', website: 'https://test.com', description: 'Test', type: 'RETAIL' });
  
  console.log('Testing getNextInvoiceNumber');
  const inv1 = await getNextInvoiceNumber(business.id);
  const inv2 = await getNextInvoiceNumber(business.id);
  console.log(inv1, inv2);
  
  console.log('Testing updateInvoiceDisplaySettings');
  await updateInvoiceDisplaySettings(business.id, { showLogoOnInvoice: true });
  
  console.log('Testing updateSalesSettings');
  await updateSalesSettings(business.id, { invoicePrefix: 'TEST-', invoiceStartingNumber: 100, allowPriceOverride: true, autoPrintReceipt: true, defaultPaymentMethod: 'CASH' });

  console.log('Done test_settings_step25');
  process.exit(0);
}

main();
