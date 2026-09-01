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
  const { prisma } = await import('../lib/db/prisma');
  const { createFeedbackRecord, updateFeedbackStatus, addFeedbackResponse } = await import('../services/feedback-management');
  const { CustomerFeedbackType, FeedbackPriority, FeedbackWorkflowStatus, MembershipRole, CommunicationChannel } = await import('../generated/prisma/client');

  const business = await prisma.business.findFirst({
    include: { memberships: { include: { user: true } } }
  });
  if (!business) throw new Error('FAIL: No business found');
  const ownerId = business.memberships[0].userId;

  let customer = await prisma.customer.findFirst({ where: { businessId: business.id } });
  if (!customer) customer = await prisma.customer.create({ data: { businessId: business.id, name: 'Feedback Test', phone: '123456789' } });

  const fb = await createFeedbackRecord(business.id, ownerId, {
      customerId: customer.id,
      type: CustomerFeedbackType.COMPLAINT,
      title: 'Bad Service',
      description: 'The cashier was rude.',
      priority: FeedbackPriority.HIGH,
      source: 'MANUAL',
      rating: 2
  }, MembershipRole.OWNER);
  
  await addFeedbackResponse(business.id, ownerId, MembershipRole.OWNER, fb.id, "Sorry for the issue", false, { channel: CommunicationChannel.WHATSAPP });
  await updateFeedbackStatus(business.id, ownerId, fb.id, FeedbackWorkflowStatus.RESOLVED, { notifyCustomer: true, channel: CommunicationChannel.WHATSAPP });
  
  console.log('SUCCESS');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
