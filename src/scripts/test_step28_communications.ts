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
  console.log('    DUKAANOS — STEP 28 COMMUNICATIONS CENTER VERIFICATION  ');
  console.log('====================================================\n');

  const { prisma } = await import('../lib/db/prisma');
  const {
    getProviderStatus,
    sendCustomerMessage,
    listCommunicationLogs,
    createMessageTemplate,
    listMessageTemplates,
    listMessageAutomations,
    toggleMessageAutomation,
  } = await import('../services/customer-communications');
  const { CommunicationChannel } = await import('../generated/prisma/client');

  // 1. Resolve Active Business & Owner
  console.log('STEP 1: Resolving Active Business and Owner User...');
  const business = await prisma.business.findFirst({
    include: {
      memberships: {
        include: { user: true },
      },
    },
  });

  if (!business || !business.memberships[0]) {
    throw new Error('FAIL: No business or membership found.');
  }
  const ownerUser = business.memberships[0].user;
  console.log(`- Business: "${business.name}" (${business.id})`);
  console.log(`- Owner: "${ownerUser.name}" (${ownerUser.id})`);
  console.log('✓ PASS: Business & user context resolved.\n');

  // 2. Check Provider Status
  console.log('STEP 2: Checking Communication Provider Configuration...');
  const whatsappStatus = await getProviderStatus(business.id, CommunicationChannel.WHATSAPP);
  console.log(`- WhatsApp Configuration: ${whatsappStatus.configured ? 'Configured' : 'Not Configured (Safe Degradation)'}`);
  console.log('✓ PASS: Provider status checked safely.\n');

  // 3. Setup a customer to message
  console.log('STEP 3: Preparing Customer Reference...');
  let customer = await prisma.customer.findFirst({ where: { businessId: business.id } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: 'Jane Doe',
        phone: '+923000000000',
        email: 'jane@example.com'
      }
    });
    console.log(`- Created mock customer: Jane Doe`);
  } else {
    console.log(`- Selected existing customer: ${customer.name}`);
  }
  console.log('✓ PASS: Customer reference resolved.\n');

  // 4. Create a Message Template
  console.log('STEP 4: Creating Message Template...');
  const templateName = `Welcome Template ${Date.now()}`;
  const template = await createMessageTemplate(business.id, {
    type: 'WELCOME',
    channel: CommunicationChannel.WHATSAPP,
    name: templateName,
    body: 'Welcome to our store, {{customer_name}}!',
    isEnabled: true
  });
  console.log(`- Created template: "${template.name}" (${template.id})`);
  
  const templates = await listMessageTemplates(business.id);
  const foundTemplate = templates.find(t => t.id === template.id);
  if (!foundTemplate) throw new Error('FAIL: Could not retrieve created template.');
  console.log(`- Verified template in list. (Total: ${templates.length})`);
  console.log('✓ PASS: Message templates functioning correctly.\n');

  // 5. Send a Message
  console.log('STEP 5: Emulating Customer Message Sending (Safe Logging)...');
  const sentMessage = await sendCustomerMessage(business.id, ownerUser.id, customer.id, {
    channel: CommunicationChannel.WHATSAPP,
    messageType: 'TRANSACTIONAL',
    templateType: 'WELCOME',
    content: 'Welcome to our store, Jane Doe!'
  });
  console.log(`- Dispatched Message: ID ${sentMessage.id}`);
  console.log(`- Delivery Status: ${sentMessage.status}`);
  if (sentMessage.status === 'SENT' || sentMessage.status === 'DELIVERED') {
    if (!whatsappStatus.configured) {
      throw new Error('FAIL: Message marked as SENT/DELIVERED but no provider is configured!');
    }
  } else {
    console.log(`- (Expected behavior as provider is not real/configured)`);
  }
  console.log('✓ PASS: Message dispatched and logged safely.\n');

  // 6. List Logs
  console.log('STEP 6: Checking Communication Logs...');
  const logs = await listCommunicationLogs(business.id, { customerId: customer.id });
  const foundLog = logs.messages.find(m => m.id === sentMessage.id);
  if (!foundLog) throw new Error('FAIL: Sent message not found in logs.');
  console.log(`- Total communication logs for customer: ${logs.pagination.total}`);
  console.log('✓ PASS: Communication logs retrieved properly.\n');

  // 7. Message Automation (Optional setup)
  console.log('STEP 7: Setting up Message Automation Rules...');
  let automation = await prisma.messageAutomation.findFirst({
    where: { businessId: business.id, eventType: 'UDHAAR_REMINDER', channel: CommunicationChannel.WHATSAPP }
  });
  if (!automation) {
    automation = await prisma.messageAutomation.create({
      data: {
        businessId: business.id,
        eventType: 'UDHAAR_REMINDER',
        channel: CommunicationChannel.WHATSAPP,
        isEnabled: false
      }
    });
  }
  const updatedAutomation = await toggleMessageAutomation(business.id, automation.id, true);
  if (!updatedAutomation.isEnabled) throw new Error('FAIL: Failed to toggle automation.');
  console.log(`- Successfully enabled automation: ${automation.eventType} (${automation.id})`);
  console.log('✓ PASS: Automations configured correctly.\n');

  console.log('====================================================');
  console.log('  ALL STEP 28 COMMUNICATIONS TESTS PASSED (7/7)     ');
  console.log('====================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('TEST_FAILED:', err);
    process.exit(1);
  });
