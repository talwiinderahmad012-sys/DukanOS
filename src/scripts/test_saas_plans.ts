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
  console.log('--- STARTING STEP 24: SAAS PLANS, USAGE LIMITS & BILLING FOUNDATION TEST SUITE ---');

  const { prisma } = await import('../lib/db/prisma');
  const { createBusinessForUser } = await import('../services/business/context');
  const { ensureDefaultFreePlan, getBusinessSubscription, assignPlanToBusiness, listAvailablePlans } = await import('../services/billing/plans');
  const { canUseFeature, getBusinessFeatureState } = await import('../services/billing/features');
  const { getBusinessUsage, checkLimit, enforceLimit } = await import('../services/billing/limits');
  const bcrypt = (await import('bcryptjs')).default;

  // ==========================================
  // 1. Testing Default Free Plan Seeding
  // ==========================================
  console.log('\n--- 1. Testing Default Free Plan Idempotent Seeding ---');
  const freePlan = await ensureDefaultFreePlan();
  if (freePlan.code !== 'FREE' || !freePlan.isActive) {
    throw new Error('Default Free plan was not created properly.');
  }

  if (freePlan.features.length < 10) {
    throw new Error(`Expected at least 10 plan features, got ${freePlan.features.length}`);
  }

  const allLimitsUnlimited = freePlan.limits.every((l) => l.limitValue === -1);
  if (!allLimitsUnlimited) {
    throw new Error('Expected all standard Free plan limits to be set to -1 (Unlimited).');
  }
  console.log(`✓ Free plan seeded with ${freePlan.features.length} standard features and unlimited quotas.`);

  // ==========================================
  // 2. Testing Atomic Plan Assignment on Store Creation
  // ==========================================
  console.log('\n--- 2. Testing Atomic Plan Assignment on Store Creation ---');
  const hashedPassword = await bcrypt.hash('PlanTester123!', 10);
  const testUser = await prisma.user.create({
    data: {
      name: 'Plan Test User',
      email: `plan.${Date.now()}@dukaanos.local`,
      password: hashedPassword,
    },
  });

  const testStore = await createBusinessForUser(testUser.id, {
    name: 'Plan Test Store',
    type: 'RETAIL',
  });

  const subData = await getBusinessSubscription(testStore.business.id);
  if (!subData.subscription || subData.subscription.status !== 'ACTIVE' || subData.plan.code !== 'FREE') {
    throw new Error('Store was not automatically assigned the active FREE plan subscription.');
  }
  console.log(`✓ Store creation atomically assigned Free plan subscription (status: ${subData.subscription.status}).`);

  // ==========================================
  // 3. Testing Feature Flag Authorization
  // ==========================================
  console.log('\n--- 3. Testing Centralized Feature Flag Access ---');
  const posAllowed = await canUseFeature(testStore.business.id, 'POS');
  const advisorAllowed = await canUseFeature(testStore.business.id, 'BUSINESS_ADVISOR');
  const offlineAllowed = await canUseFeature(testStore.business.id, 'OFFLINE_POS');

  if (!posAllowed || !advisorAllowed || !offlineAllowed) {
    throw new Error('Core retail features were unexpectedly blocked under the Free plan.');
  }

  const featureMap = await getBusinessFeatureState(testStore.business.id);
  if (!featureMap.POS || !featureMap.INVENTORY || !featureMap.REPORTS) {
    throw new Error('Feature state map missing active core retail flags.');
  }
  console.log(`✓ Feature flags verified: ${Object.keys(featureMap).length} standard features enabled.`);

  // ==========================================
  // 4. Testing Usage Quota Calculations
  // ==========================================
  console.log('\n--- 4. Testing Real-Time Resource Usage Calculation ---');
  const usage = await getBusinessUsage(testStore.business.id);
  if (usage.metrics.length < 5) {
    throw new Error('Usage metrics returned insufficient dimensions.');
  }

  const branchMetric = usage.metrics.find((m) => m.limitKey === 'MAX_BRANCHES');
  if (!branchMetric || branchMetric.current !== 1 || !branchMetric.isUnlimited) {
    throw new Error('Branch usage calculation incorrect.');
  }
  console.log(`✓ Real-time usage calculation verified (Branches: ${branchMetric.current}/Unlimited).`);

  // ==========================================
  // 5. Testing Simulated Limit Enforcement
  // ==========================================
  console.log('\n--- 5. Testing Simulated Limit Enforcement & Domain Guards ---');
  // Set a simulated finite limit of 1 branch for testStore
  await prisma.businessEntitlement.create({
    data: {
      businessId: testStore.business.id,
      limitKey: 'MAX_BRANCHES',
      limitValue: 1, // Store already has 1 branch
    },
  });

  const check = await checkLimit(testStore.business.id, 'MAX_BRANCHES');
  if (!check.isBlocked || check.remaining !== 0) {
    throw new Error('Limit check failed to detect quota saturation.');
  }

  let limitBlocked = false;
  try {
    await enforceLimit(testStore.business.id, 'MAX_BRANCHES');
  } catch (err: any) {
    if (err.message.includes('Plan Limit Reached')) {
      limitBlocked = true;
    }
  }

  if (!limitBlocked) {
    throw new Error('enforceLimit() did not throw on quota saturation!');
  }
  console.log(`✓ Quota enforcement correctly blocked overflow operation with domain error.`);

  // ==========================================
  // 6. Testing Feature Override Precedence
  // ==========================================
  console.log('\n--- 6. Testing Entitlement Override Precedence ---');
  await prisma.businessEntitlement.create({
    data: {
      businessId: testStore.business.id,
      featureKey: 'CCTV',
      isEnabled: false, // Explicit override disabling CCTV
    },
  });

  const cctvOverridden = await canUseFeature(testStore.business.id, 'CCTV');
  if (cctvOverridden !== false) {
    throw new Error('BusinessEntitlement override did not take precedence over plan feature flag!');
  }
  console.log(`✓ Entitlement override precedence verified (Plan=true, Override=false -> false).`);

  // ==========================================
  // 7. Testing Platform Plan Management
  // ==========================================
  console.log('\n--- 7. Testing Platform Governance & Plan Listing ---');
  const allPlans = await listAvailablePlans();
  if (allPlans.length === 0 || !allPlans.some((p) => p.code === 'FREE')) {
    throw new Error('Platform plan listing did not return the Free plan.');
  }
  console.log(`✓ Platform governance verified: ${allPlans.length} active plans configured.`);

  console.log('\n🎉 ALL STEP 24 SAAS PLANS & BILLING FOUNDATION TESTS PASSED (100% SUCCESS)!\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Step 24 test failed:', err);
  process.exit(1);
});
