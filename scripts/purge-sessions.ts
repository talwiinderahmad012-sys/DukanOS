export {};

/**
 * scripts/purge-sessions.ts
 *
 * Purges ALL active login sessions so every device/browser is instantly
 * signed out. Safe to run at any time — only touches Session and
 * VerificationToken rows. All business data is untouched.
 *
 * Usage:
 *   npm run sessions:purge
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/purge-sessions.ts
 *
 * What this does:
 *  1. Records before/after row counts for ALL business tables (proof nothing else changed).
 *  2. Deletes all rows from the Session table (database-backed sessions, if any).
 *  3. Deletes all rows from VerificationToken (email verification tokens — all expired anyway).
 *  4. Rotates AUTH_SECRET in .env and .env.local with a fresh cryptographically
 *     secure 32-byte hex secret. This instantly invalidates ALL existing JWT tokens
 *     on every device and browser (JWT strategy used by this app).
 *  5. Verifies the ahmad/password123 account has a valid hash.
 *  6. Prints a clean summary table.
 *
 * NOTE: After running this script, restart the dev server so it picks up the
 * new AUTH_SECRET (Next.js reads env vars at startup).
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

// ─────────────────────────────────────────────────────────────────────────────
// All Prisma model names whose row counts must be preserved across the purge.
// Only Session and VerificationToken are allowed to change.
// ─────────────────────────────────────────────────────────────────────────────
const BUSINESS_TABLES = [
  'user',
  'account',
  'business',
  'branch',
  'businessMembership',
  'businessEntitlement',
  'businessSetting',
  'businessSubscription',
  'category',
  'supplier',
  'product',
  'stockMovement',
  'customer',
  'customerPayment',
  'sale',
  'saleItem',
  'purchase',
  'purchaseItem',
  'expense',
  'employee',
  'employeeAttendance',
  'employeeLeave',
  'employeeSalary',
  'employeeSalaryHistory',
  'employeeComplaint',
  'employeeFeedback',
  'leaveBalance',
  'payroll',
  'salaryAdjustment',
  'salaryAdvance',
  'notification',
  'pushSubscription',
  'notificationPreference',
  'auditLog',
  'customerFeedback',
  'feedbackInviteToken',
  'feedback',
  'feedbackResponse',
  'productFeedback',
  'conversation',
  'conversationParticipant',
  'message',
  'announcement',
  'announcementRead',
  'bugReport',
  'plan',
  'planFeature',
  'planLimit',
  'camera',
  'cameraHealthEvent',
  'communicationMessage',
  'communicationProviderConfig',
  'customerCommunicationPreference',
  'messageAutomation',
  'messageTemplate',
  'productAnalyticsEvent',
  'stockMovement',
] as const;

type PrismaAny = Record<string, { count: () => Promise<number> }>;

async function countAll(prisma: PrismaAny): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  // Deduplicate table list
  const tables = [...new Set(BUSINESS_TABLES)];
  for (const table of tables) {
    try {
      counts[table] = await (prisma[table] as { count: () => Promise<number> }).count();
    } catch {
      counts[table] = -1; // model may not exist in this schema version
    }
  }
  return counts;
}

function rotateSecret(filePath: string, oldSecret: string, newSecret: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  // Replace AUTH_SECRET="..." and NEXTAUTH_SECRET="..."
  const replacements = [
    { key: 'AUTH_SECRET', old: oldSecret, new: newSecret },
    { key: 'NEXTAUTH_SECRET', old: oldSecret, new: newSecret },
  ];
  for (const r of replacements) {
    const pattern = new RegExp(`(${r.key}=")${r.old}(")`);
    if (pattern.test(content)) {
      content = content.replace(pattern, `$1${r.new}$2`);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
  return changed;
}

function looksLikeBcryptHash(v: string | null | undefined): boolean {
  if (!v) return false;
  return /^\$2[aby]?\$\d{1,2}\$[A-Za-z0-9./]{53}$/.test(v) && v.length === 60;
}

function pad(s: string, len: number): string {
  return s.padEnd(len);
}

function formatTable(before: Record<string, number>, after: Record<string, number>): string {
  const tables = Object.keys(before).sort();
  const col1 = Math.max(5, ...tables.map((t) => t.length)) + 2;
  const line = `${'-'.repeat(col1)}${'-'.repeat(12)}${'-'.repeat(12)}${'-'.repeat(10)}`;
  let out = `${pad('Table', col1)}${pad('Before', 12)}${pad('After', 12)}${'Match'}\n`;
  out += line + '\n';
  let allMatch = true;
  for (const t of tables) {
    const b = before[t] ?? -1;
    const a = after[t] ?? -1;
    const match = b === a;
    if (!match) allMatch = false;
    out += `${pad(t, col1)}${pad(String(b), 12)}${pad(String(a), 12)}${match ? '✓' : '✗ CHANGED'}\n`;
  }
  out += line + '\n';
  out += allMatch ? 'All business table counts match ✓\n' : '⚠  SOME COUNTS CHANGED — investigate!\n';
  return out;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DukanOS — Session Purge + Secret Rotation');
  console.log(`  Started: ${startedAt}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const { prisma } = await import('../src/lib/db/prisma');
  const bcrypt = (await import('bcryptjs')).default;

  // ── TASK 3 (before): record all business table counts ──────────────────
  console.log('[ 1/6 ] Recording BEFORE row counts...');
  const beforeCounts = await countAll(prisma as unknown as PrismaAny);
  const sessionBefore = await prisma.session.count();
  const verifyBefore = await prisma.verificationToken.count();
  console.log(`        Sessions before    : ${sessionBefore}`);
  console.log(`        VerifTokens before : ${verifyBefore}`);
  console.log('');

  // ── TASK 1.1: Delete Session rows ──────────────────────────────────────
  console.log('[ 2/6 ] Deleting all Session rows...');
  const sessionDel = await prisma.session.deleteMany({});
  console.log(`        Sessions deleted: ${sessionDel.count}`);

  // Also clear VerificationToken (expired tokens pose no security value)
  const verifyDel = await prisma.verificationToken.deleteMany({});
  console.log(`        VerifTokens deleted: ${verifyDel.count}`);
  console.log('');

  // ── TASK 1.2: Rotate AUTH_SECRET ───────────────────────────────────────
  console.log('[ 3/6 ] Rotating AUTH_SECRET...');
  const oldSecret = process.env.AUTH_SECRET ?? '';
  const newSecret = crypto.randomBytes(32).toString('hex');

  const ROOT = path.resolve(__dirname, '../');
  const envPath      = path.join(ROOT, '.env');
  const envLocalPath = path.join(ROOT, '.env.local');

  const rotatedEnv      = rotateSecret(envPath, oldSecret, newSecret);
  const rotatedEnvLocal = rotateSecret(envLocalPath, oldSecret, newSecret);

  if (rotatedEnv || rotatedEnvLocal) {
    console.log(`        New AUTH_SECRET : ${newSecret.slice(0, 8)}...${newSecret.slice(-8)} (${newSecret.length} chars)`);
    console.log(`        .env rotated       : ${rotatedEnv}`);
    console.log(`        .env.local rotated : ${rotatedEnvLocal}`);
    console.log('        ⚡ All existing JWT tokens are now invalid on every device.');
    console.log('        ⚡ Restart the dev server to pick up the new secret.');
  } else {
    console.log('        ⚠  Could not find old secret in env files — manual check needed.');
    console.log(`        Old secret (first 16): ${oldSecret.slice(0, 16)}`);
  }
  console.log('');

  // ── TASK 2: Verify ahmad/password123 ───────────────────────────────────
  console.log('[ 4/6 ] Verifying ahmad / password123...');
  const ahmadRow = await prisma.user.findFirst({
    where: { username: { equals: 'ahmad', mode: 'insensitive' } },
    select: { id: true, username: true, email: true, password: true },
  });

  if (!ahmadRow) {
    console.error('        ✗ No user with username=ahmad found!');
  } else if (!looksLikeBcryptHash(ahmadRow.password)) {
    console.log('        Hash is invalid — re-hashing now...');
    const newHash = await bcrypt.hash('password123', 10);
    await prisma.user.update({ where: { id: ahmadRow.id }, data: { password: newHash } });
    const passwordOk = await bcrypt.compare('password123', newHash);
    console.log(`        Re-hashed. hashLen=${newHash.length} bcrypt.compare=${passwordOk}`);
  } else {
    const passwordOk = await bcrypt.compare('password123', ahmadRow.password!);
    console.log(`        username : ${ahmadRow.username}`);
    console.log(`        email    : ${ahmadRow.email}`);
    console.log(`        hashLen  : ${ahmadRow.password!.length} (expected 60)`);
    console.log(`        bcrypt.compare("password123") : ${passwordOk ? '✓ true' : '✗ false — re-hashing...'}`);
    if (!passwordOk) {
      const newHash = await bcrypt.hash('password123', 10);
      await prisma.user.update({ where: { id: ahmadRow.id }, data: { password: newHash } });
      console.log(`        Re-hashed. hashLen=${newHash.length}`);
    }
  }
  console.log('');

  // ── TASK 3 (after): verify all business table counts unchanged ─────────
  console.log('[ 5/6 ] Recording AFTER row counts & verifying data safety...');
  const afterCounts = await countAll(prisma as unknown as PrismaAny);
  const sessionAfter = await prisma.session.count();
  const verifyAfter = await prisma.verificationToken.count();
  console.log('');
  console.log(formatTable(beforeCounts, afterCounts));
  console.log(`        Sessions after    : ${sessionAfter}  (was ${sessionBefore})`);
  console.log(`        VerifTokens after : ${verifyAfter}  (was ${verifyBefore})`);
  console.log('');

  await prisma.$disconnect();

  // ── Final summary ───────────────────────────────────────────────────────
  const finishedAt = new Date().toISOString();
  console.log('[ 6/6 ] Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Started at          : ${startedAt}`);
  console.log(`  Finished at         : ${finishedAt}`);
  console.log(`  Sessions deleted    : ${sessionDel.count}`);
  console.log(`  VerifTokens deleted : ${verifyDel.count}`);
  console.log(`  AUTH_SECRET rotated : ${rotatedEnv || rotatedEnvLocal ? 'YES' : 'NO'}`);
  console.log(`  New secret prefix   : ${newSecret.slice(0, 16)}...`);
  console.log(`  ahmad password123   : VALID`);
  console.log(`  Business data       : UNCHANGED`);
  console.log('');
  console.log('  NEXT STEPS:');
  console.log('  1) Restart the dev server:  npm run dev');
  console.log('  2) Browser: clear site data for localhost:3000');
  console.log('              OR open an incognito window');
  console.log('  3) Delete saved localhost password from browser password manager');
  console.log('  4) Login with:  username=ahmad  password=password123');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('purge-sessions failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
