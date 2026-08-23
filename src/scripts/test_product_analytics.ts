export {};

// Load environment variables for standalone execution
require('dotenv').config();

// Stub 'server-only' for standalone node script execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  console.log('--- STARTING STEP 23: PRODUCT ANALYTICS & FEEDBACK INTELLIGENCE TEST SUITE ---');

  const { prisma } = await import('../lib/db/prisma');
  const { createBusinessForUser } = await import('../services/business/context');
  const { 
    trackActivationEvent, 
    sanitizeAnalyticsMetadata,
    ALLOWED_ANALYTICS_EVENTS 
  } = await import('../lib/analytics/tracker');
  const { 
    getActivationFunnelMetrics, 
    getFeatureAdoptionMetrics, 
    getUserRetentionMetrics, 
    getReliabilityMetrics, 
    getProductHealthScore 
  } = await import('../services/product-analytics');
  const {
    createBugReport,
    updateBugReportStatus,
    submitProductFeedback,
    updateProductFeedbackStatus,
    getProductFeedbackOverview,
  } = await import('../services/product-feedback');
  const bcrypt = (await import('bcryptjs')).default;

  // Setup test user & store
  const hashedPassword = await bcrypt.hash('AnalyticsTester123!', 10);
  const testUser = await prisma.user.create({
    data: {
      name: 'Analytics Test User',
      email: `analytics.${Date.now()}@dukaanos.local`,
      password: hashedPassword,
    },
  });

  const testStore = await createBusinessForUser(testUser.id, {
    name: 'Analytics Test Store',
    type: 'RETAIL',
  });

  // ==========================================
  // 1. Testing Event Ingestion & Privacy Sanitization
  // ==========================================
  console.log('\n--- 1. Testing Privacy-First Event Ingestion & Metadata Sanitization ---');
  const rawMetadata = {
    itemCount: 5,
    channel: 'POS',
    password: 'SuperSecretPassword!',
    total: 25000,
    price: 450,
    salary: 35000,
    phone: '03001234567',
    rtspUrl: 'rtsp://admin:pass@192.168.1.50/stream',
  };

  const sanitized = sanitizeAnalyticsMetadata(rawMetadata);
  if (sanitized.password || sanitized.total || sanitized.price || sanitized.salary || sanitized.phone || sanitized.rtspUrl) {
    throw new Error('Sanitizer failed to strip sensitive financial and credential keys!');
  }
  if (sanitized.itemCount !== 5 || sanitized.channel !== 'POS') {
    throw new Error('Sanitizer stripped legitimate non-sensitive telemetry fields!');
  }

  // Ingest valid event
  await trackActivationEvent({
    eventName: 'PRODUCT_CREATED',
    userId: testUser.id,
    businessId: testStore.business.id,
    metadata: rawMetadata,
  });

  const eventRecord = await prisma.productAnalyticsEvent.findFirst({
    where: {
      businessId: testStore.business.id,
      eventName: 'PRODUCT_CREATED',
    },
  });

  if (!eventRecord) {
    throw new Error('Failed to record ProductAnalyticsEvent in database.');
  }
  console.log(`✓ Privacy sanitization and event ingestion verified.`);

  // ==========================================
  // 2. Testing Idempotency & Activation Funnel
  // ==========================================
  console.log('\n--- 2. Testing Activation Idempotency & Funnel Metrics ---');
  // First sale event
  await trackActivationEvent({
    eventName: 'FIRST_SALE_COMPLETED',
    userId: testUser.id,
    businessId: testStore.business.id,
  });

  // Duplicate first sale event (should be ignored by idempotency check)
  await trackActivationEvent({
    eventName: 'FIRST_SALE_COMPLETED',
    userId: testUser.id,
    businessId: testStore.business.id,
  });

  const firstSaleEvents = await prisma.productAnalyticsEvent.findMany({
    where: {
      businessId: testStore.business.id,
      eventName: 'FIRST_SALE_COMPLETED',
    },
  });

  if (firstSaleEvents.length !== 1) {
    throw new Error(`Expected exactly 1 FIRST_SALE_COMPLETED event, got ${firstSaleEvents.length}`);
  }

  const funnel = await getActivationFunnelMetrics();
  if (!funnel.stages || funnel.stages.length !== 5) {
    throw new Error('Activation funnel did not return expected 5 stages.');
  }
  console.log(`✓ Idempotency and activation funnel verified: ${funnel.totalActivated} stores activated.`);

  // ==========================================
  // 3. Testing Feature Adoption, Retention & Health Score
  // ==========================================
  console.log('\n--- 3. Testing Feature Adoption, Retention & Product Health Score ---');
  const adoption = await getFeatureAdoptionMetrics();
  if (adoption.features.length < 5) {
    throw new Error('Feature adoption metrics returned insufficient module count.');
  }

  const retention = await getUserRetentionMetrics();
  const reliability = await getReliabilityMetrics();
  const healthScore = await getProductHealthScore();

  if (typeof healthScore.score !== 'number' || healthScore.score < 0 || healthScore.score > 100) {
    throw new Error(`Invalid Product Health Score computed: ${healthScore.score}`);
  }
  console.log(`✓ Metrics computed: Health Score=${healthScore.score}/100 (${healthScore.rating}), Reliability=${reliability.systemReliabilityRate}%.`);

  // ==========================================
  // 4. Testing Bug Report Creation & Triage Lifecycle
  // ==========================================
  console.log('\n--- 4. Testing Bug Report Triage Lifecycle ---');
  const bug = await createBugReport({
    reporterUserId: testUser.id,
    businessId: testStore.business.id,
    module: 'POS',
    title: 'POS Barcode Scanning Timeout',
    description: 'Scanning long barcodes occasionally delays by 500ms.',
    severity: 'P1',
  });

  if (bug.status !== 'NEW' || bug.severity !== 'P1') {
    throw new Error('Bug report created with incorrect status/severity.');
  }

  // Triage bug
  const triagedBug = await updateBugReportStatus({
    bugId: bug.id,
    status: 'IN_PROGRESS',
    developerNotes: 'Investigating barcode debouncing handler in POS input component.',
    severity: 'P2',
  });

  if (triagedBug.status !== 'IN_PROGRESS' || triagedBug.severity !== 'P2') {
    throw new Error('Bug triage status update failed.');
  }

  // Resolve bug
  const resolvedBug = await updateBugReportStatus({
    bugId: bug.id,
    status: 'RESOLVED',
    developerNotes: 'Optimized search debounce delay to 100ms. Fixed in PR #104.',
  });

  if (resolvedBug.status !== 'RESOLVED' || !resolvedBug.resolvedAt) {
    throw new Error('Bug resolution did not record resolvedAt timestamp.');
  }
  console.log(`✓ Bug report triage lifecycle verified (NEW -> IN_PROGRESS -> RESOLVED).`);

  // ==========================================
  // 5. Testing Product Satisfaction & Feature Request Roadmap
  // ==========================================
  console.log('\n--- 5. Testing Product Satisfaction & Feature Requests ---');
  const feedback = await submitProductFeedback({
    userId: testUser.id,
    businessId: testStore.business.id,
    type: 'SATISFACTION',
    satisfaction: 'GREAT',
    message: 'DukaanOS POS is extremely fast for our rush hours!',
  });

  const featureReq = await submitProductFeedback({
    userId: testUser.id,
    businessId: testStore.business.id,
    type: 'FEATURE_REQUEST',
    category: 'Inventory',
    title: 'Batch Expiry Date Alerts',
    message: 'Would love automated notifications 30 days before medicine batches expire.',
  });

  const updatedFeature = await updateProductFeedbackStatus({
    feedbackId: featureReq.id,
    status: 'PLANNED',
    adminNotes: 'Scheduled for Pharmacy Advanced Expansion.',
  });

  if (updatedFeature.status !== 'PLANNED') {
    throw new Error('Feature request roadmap status update failed.');
  }

  const overview = await getProductFeedbackOverview();
  if (overview.satisfaction.great < 1 || overview.featureRequests.planned < 1) {
    throw new Error('Product feedback overview did not reflect satisfaction/feature counts.');
  }
  console.log(`✓ Product satisfaction and feature roadmap triage verified.`);

  // ==========================================
  // 6. Testing Telemetry Failure Isolation
  // ==========================================
  console.log('\n--- 6. Testing Failure Isolation (Non-Blocking Side Effects) ---');
  // Pass an invalid event name or malformed data - must not throw
  await trackActivationEvent({
    eventName: 'INVALID_EVENT_NAME_TEST' as any,
    userId: 'non-existent-user-id',
  });
  console.log(`✓ Telemetry error isolation verified (zero throws on invalid events).`);

  console.log('\n🎉 ALL STEP 23 PRODUCT ANALYTICS & FEEDBACK TESTS PASSED (100% SUCCESS)!\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Step 23 test failed:', err);
  process.exit(1);
});
