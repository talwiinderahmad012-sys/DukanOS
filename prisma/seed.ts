/**
 * DukaanOS database seed — fully idempotent.
 *
 * Runs via `npx prisma db seed` (configured in prisma.config.ts under
 * `migrations.seed`; Prisma 7 ignores package.json#prisma.seed). Can also be
 * run standalone: `npx tsx prisma/seed.ts`.
 *
 * Two properties matter here:
 *  1. 'server-only' must be stubbed BEFORE the shared Prisma client is
 *     imported (src/lib/db/prisma imports it, and the real module throws
 *     outside React Server Components) — the Module require-stub pattern.
 *  2. Every write is an `upsert` against a stable unique key (or a fixed id
 *     where the model has no natural unique constraint), so re-running the
 *     seed never duplicates data and never crashes.
 */

// Load .env first, then .env.local overriding it (same precedence as Next.js).
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

// --- Module require-stub pattern: neutralize 'server-only' outside RSC ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return originalRequire.apply(this, [id, ...args]);
};

import bcrypt from 'bcryptjs';

import {
  BusinessType,
  BusinessStatus,
  MembershipRole,
  MovementType,
} from '../src/generated/prisma/client';

// Deterministic ids for models without a natural unique constraint
// (Business, Supplier, Customer, StockMovement have no @@unique).
const SEED_BUSINESS_ID = 'seed-business-super-mart-0001';
const SEED_SUPPLIER_ID = 'seed-supplier-national-0001';
const SEED_CUSTOMER_ID = 'seed-customer-walkin-0001';
const SEED_MOVEMENT_ID = 'seed-movement-opening-0001';

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_SEED) {
    console.error('CRITICAL: Seeding demo data into a production environment is strictly prohibited.');
    process.exit(1);
  }

  // Imported dynamically AFTER the 'server-only' stub is installed above.
  const { prisma } = await import('../src/lib/db/prisma');

  console.log('Seeding development database (idempotent)...');

  // 1. User (unique: email)
  const user = await prisma.user.upsert({
    where: { email: 'admin@dukaanos.local' },
    update: { name: 'Admin User' },
    create: {
      name: 'Admin User',
      email: 'admin@dukaanos.local',
    },
  });

  // 1b. Demo user "ahmad" (login credential) — bcrypt-hashed password123.
  // Upserted so re-running the seed never violates the email/username uniques.
  const ahmadHashedPassword = await bcrypt.hash('password123', 10);
  const ahmad = await prisma.user.upsert({
    where: { email: 'ahmad@dukaanos.local' },
    update: {
      name: 'Ahmad',
      username: 'ahmad',
      password: ahmadHashedPassword,
    },
    create: {
      name: 'Ahmad',
      username: 'ahmad',
      email: 'ahmad@dukaanos.local',
      password: ahmadHashedPassword,
    },
  });

  // 2. Business (no natural unique → fixed-id upsert)
  const business = await prisma.business.upsert({
    where: { id: SEED_BUSINESS_ID },
    update: {
      name: 'Super Mart Demo',
      type: BusinessType.RETAIL,
      status: BusinessStatus.ACTIVE,
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      city: 'Lahore',
      country: 'Pakistan',
    },
    create: {
      id: SEED_BUSINESS_ID,
      name: 'Super Mart Demo',
      type: BusinessType.RETAIL,
      status: BusinessStatus.ACTIVE,
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      city: 'Lahore',
      country: 'Pakistan',
    },
  });

  // 3. Membership (unique: userId+businessId)
  await prisma.businessMembership.upsert({
    where: {
      userId_businessId: { userId: user.id, businessId: business.id },
    },
    update: { role: MembershipRole.OWNER },
    create: {
      userId: user.id,
      businessId: business.id,
      role: MembershipRole.OWNER,
    },
  });

  // 3b. Membership for the "ahmad" demo user (unique: userId+businessId).
  await prisma.businessMembership.upsert({
    where: {
      userId_businessId: { userId: ahmad.id, businessId: business.id },
    },
    update: { role: MembershipRole.OWNER },
    create: {
      userId: ahmad.id,
      businessId: business.id,
      role: MembershipRole.OWNER,
    },
  });

  // 4. Branch (unique: businessId+code)
  const branch = await prisma.branch.upsert({
    where: { businessId_code: { businessId: business.id, code: 'MAIN-01' } },
    update: { name: 'Main Branch', city: 'Lahore' },
    create: {
      businessId: business.id,
      name: 'Main Branch',
      code: 'MAIN-01',
      city: 'Lahore',
    },
  });

  // 5. Category (unique: businessId+name)
  const category = await prisma.category.upsert({
    where: { businessId_name: { businessId: business.id, name: 'Beverages' } },
    update: { description: 'Drinks and juices' },
    create: {
      businessId: business.id,
      name: 'Beverages',
      description: 'Drinks and juices',
    },
  });

  // 6. Supplier (no natural unique → fixed-id upsert)
  const supplier = await prisma.supplier.upsert({
    where: { id: SEED_SUPPLIER_ID },
    update: { name: 'National Distributors Ltd', phone: '03000000000' },
    create: {
      id: SEED_SUPPLIER_ID,
      businessId: business.id,
      name: 'National Distributors Ltd',
      phone: '03000000000',
    },
  });

  // 7. Product (unique: businessId+sku)
  const product = await prisma.product.upsert({
    where: { businessId_sku: { businessId: business.id, sku: 'BEV-MAN-1L' } },
    update: {
      categoryId: category.id,
      name: 'Mango Juice 1L',
      purchasePrice: 150.0,
      sellingPrice: 200.0,
      currentStock: 50,
      minStockThreshold: 10,
    },
    create: {
      businessId: business.id,
      categoryId: category.id,
      name: 'Mango Juice 1L',
      sku: 'BEV-MAN-1L',
      barcode: '1234567890123',
      purchasePrice: 150.0,
      sellingPrice: 200.0,
      currentStock: 50,
      minStockThreshold: 10,
    },
  });

  // 8. Opening stock movement (no natural unique → fixed-id upsert)
  await prisma.stockMovement.upsert({
    where: { id: SEED_MOVEMENT_ID },
    update: {
      quantity: 50,
      previousStock: 0,
      resultingStock: 50,
      notes: 'Initial seed stock',
    },
    create: {
      id: SEED_MOVEMENT_ID,
      businessId: business.id,
      branchId: branch.id,
      productId: product.id,
      movementType: MovementType.OPENING,
      quantity: 50,
      previousStock: 0,
      resultingStock: 50,
      notes: 'Initial seed stock',
    },
  });

  // 9. Customer (no natural unique → fixed-id upsert)
  await prisma.customer.upsert({
    where: { id: SEED_CUSTOMER_ID },
    update: { name: 'Walk-in Customer', phone: '00000000000' },
    create: {
      id: SEED_CUSTOMER_ID,
      businessId: business.id,
      name: 'Walk-in Customer',
      phone: '00000000000',
    },
  });

  console.log('Seed completed successfully (all records upserted — safe to re-run).');
  console.log(`  business : ${business.name} (${business.id})`);
  console.log(`  owner    : ${user.email}`);
  console.log(`  demo     : ahmad@dukaanos.local (username: ahmad — demo password as documented in prisma/seed.ts)`);
  console.log(`  branch   : ${branch.name} (${branch.code})`);
  console.log(`  supplier : ${supplier.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const { prisma } = await import('../src/lib/db/prisma');
      await prisma.$disconnect();
    } catch {
      // Client never created — nothing to disconnect.
    }
  });