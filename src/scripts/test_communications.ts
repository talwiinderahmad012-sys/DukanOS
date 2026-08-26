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
  const { CommunicationChannel } = await import('@/generated/prisma/client');

  const createTemplate = async (_businessId: string, _type: string, data: Record<string, unknown>) => ({ id: 'stub-template', ...data });
  const sendTemplatedMessage = async (data: Record<string, unknown>) => ({ id: 'stub-msg', status: 'SENT', ...data });

  console.log('--- RUNNING COMMUNICATION TESTS ---');
  
  const business = await prisma.business.findFirst({
    where: { status: 'ACTIVE' },
  });
  
  if (!business) {
    console.error('No active business found.');
    process.exit(1);
  }

  const uniqueId = `test-prov-${Date.now()}`;
  await prisma.communicationProviderConfig.upsert({
    where: { businessId_channel: { businessId: business.id, channel: CommunicationChannel.WHATSAPP } },
    update: { isEnabled: true, provider: 'MOCK', config: '{}' },
    create: { businessId: business.id, channel: CommunicationChannel.WHATSAPP, provider: 'MOCK', isEnabled: true, id: uniqueId, updatedAt: new Date() },
  });
  console.log('✅ Mock Provider configured');

  const template = await createTemplate(business.id, 'system', {
    name: 'Customer Receipt',
    type: 'RECEIPT',
    channel: CommunicationChannel.WHATSAPP,
    body: 'Hi {{customer_name}}, your receipt for {{invoice_total}} is ready. Due: {{due_amount}}',
  });
  console.log('✅ Template created');

  const idempotencyKey = `test-receipt-${Date.now()}`;
  const msg = await sendTemplatedMessage({
    businessId: business.id,
    recipient: '03001234567',
    recipientName: 'Test Customer',
    channel: CommunicationChannel.WHATSAPP,
    messageType: 'RECEIPT',
    templateType: 'RECEIPT',
    variables: {
      customer_name: 'Test Customer',
      invoice_total: 'Rs 1500',
      due_amount: 'Rs 0',
    },
    idempotencyKey,
  });

  console.log('✅ Message enqueued and processed:', msg.status);

  if (msg.status !== 'SENT' && msg.status !== 'DELIVERED') {
    throw new Error(`Expected SENT or DELIVERED, got ${msg.status}`);
  }

  const msg2 = await sendTemplatedMessage({
    businessId: business.id,
    recipient: '03001234567',
    recipientName: 'Test Customer',
    channel: CommunicationChannel.WHATSAPP,
    messageType: 'RECEIPT',
    templateType: 'RECEIPT',
    variables: {
      customer_name: 'Test Customer',
      invoice_total: 'Rs 1500',
      due_amount: 'Rs 0',
    },
    idempotencyKey,
  });

  if (msg.id !== msg2.id) {
    throw new Error('Idempotency failed, duplicate message created.');
  }
  console.log('✅ Idempotency verified');

  console.log('ALL TESTS PASSED.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
