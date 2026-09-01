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
  console.log('====================================================');
  console.log('    DUKAANOS — STEP 29 CUSTOMER FEEDBACK VERIFICATION  ');
  console.log('====================================================\n');

  const { prisma } = await import('../lib/db/prisma');
  const { createFeedbackRecord, updateFeedbackStatus } = await import('../services/feedback-management');
  const { CustomerFeedbackType, FeedbackPriority, FeedbackWorkflowStatus, MembershipRole } = await import('../generated/prisma/client');

  const business = await prisma.business.findFirst({
    include: { memberships: { include: { user: true } } }
  });

  if (!business) throw new Error('FAIL: No business found');
  const ownerId = business.memberships[0].userId;

  let customer = await prisma.customer.findFirst({ where: { businessId: business.id } });
  if (!customer) {
      customer = await prisma.customer.create({
          data: { businessId: business.id, name: 'Feedback Test Customer' }
      });
  }

  console.log('1. Creating Feedback Record...');
  const fb = await createFeedbackRecord(business.id, ownerId, {
      customerId: customer.id,
      type: CustomerFeedbackType.COMPLAINT,
      title: 'Bad Service',
      description: 'The cashier was rude.',
      priority: FeedbackPriority.HIGH,
      source: 'MANUAL',
      rating: 2
  }, MembershipRole.OWNER);
  console.log(`✓ Feedback created: ${fb.id}`);

  console.log('2. Updating Feedback Status...');
  await updateFeedbackStatus(business.id, ownerId, fb.id, FeedbackWorkflowStatus.RESOLVED);
  const updated = await prisma.feedback.findUnique({ where: { id: fb.id } });
  if (updated?.status !== FeedbackWorkflowStatus.RESOLVED) {
      throw new Error('FAIL: Feedback status not updated');
  }
  console.log(`✓ Feedback status updated to ${updated.status}`);

  console.log('\n====================================================');
  console.log('  ALL STEP 29 FEEDBACK TESTS PASSED                 ');
  console.log('====================================================\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
