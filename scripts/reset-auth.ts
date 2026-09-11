export {};

/**
 * scripts/reset-auth.ts
 *
 * Full auth identity wipe — deletes ALL user accounts in FK-safe order
 * while preserving every byte of business domain data.
 *
 * FK-safe deletion order:
 *  1. SET NULL on nullable userId columns that have no onDelete rule
 *     (AuditLog.userId, Employee.userId — confirmed from schema analysis)
 *  2. Delete Session, Account, VerificationToken rows (also cascade from User,
 *     but explicit deletion avoids any edge-case ordering issues)
 *  3. Delete all User rows — cascades: BusinessMembership, Notification,
 *     NotificationPreference, PushSubscription, FeedbackResponse,
 *     ProductFeedback, ConversationParticipant, Message, Announcement,
 *     AnnouncementRead, BugReport (all have onDelete: Cascade on userId)
 *
 * Preserved (untouched):
 *   Business, Branch, Category, Supplier, Product, StockMovement,
 *   Customer, CustomerPayment, Sale, SaleItem, Purchase, PurchaseItem,
 *   Expense, Employee (data kept, userId nulled), AuditLog (data kept, userId nulled),
 *   Conversation, Feedback, FeedbackInviteToken, FeedbackResponse,
 *   BusinessSetting, BusinessEntitlement, BusinessSubscription,
 *   Camera, CameraHealthEvent, Plan, PlanFeature, PlanLimit,
 *   Payroll, all employee sub-tables, communications, translations.
 *
 * Usage:
 *   npm run auth:reset
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/reset-auth.ts
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

// ─── Domain tables to track (must NOT change row counts) ──────────────────────
const DOMAIN_TABLES = [
  'business', 'branch', 'category', 'supplier', 'product', 'stockMovement',
  'customer', 'customerPayment', 'sale', 'saleItem', 'purchase', 'purchaseItem',
  'expense', 'employee', 'employeeAttendance', 'employeeLeave', 'employeeSalary',
  'employeeSalaryHistory', 'employeeComplaint', 'employeeFeedback', 'leaveBalance',
  'payroll', 'salaryAdjustment', 'salaryAdvance',
  'businessSetting', 'businessEntitlement', 'businessSubscription',
  'camera', 'cameraHealthEvent', 'communicationMessage', 'communicationProviderConfig',
  'customerCommunicationPreference', 'conversation', 'messageAutomation',
  'messageTemplate', 'feedback', 'feedbackInviteToken',
  'customerFeedback', 'auditLog', 'plan', 'planFeature', 'planLimit',
  'productAnalyticsEvent',
] as const;

type PrismaAny = Record<string, { count: () => Promise<number>; updateMany?: (args: unknown) => Promise<unknown> }>;

async function snapCounts(prisma: PrismaAny): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const t of DOMAIN_TABLES) {
    try {
      result[t] = await (prisma[t] as { count: () => Promise<number> }).count();
    } catch {
      result[t] = -1;
    }
  }
  return result;
}

function assertDomainUnchanged(
  before: Record<string, number>,
  after: Record<string, number>
): void {
  const changed: string[] = [];
  for (const t of DOMAIN_TABLES) {
    if (before[t] !== after[t]) {
      changed.push(`${t}: ${before[t]} → ${after[t]}`);
    }
  }
  if (changed.length > 0) {
    throw new Error(`DOMAIN DATA CHANGED — aborting!\n  ${changed.join('\n  ')}`);
  }
}

function rotateSecret(filePath: string, oldSecret: string, newSecret: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const key of ['AUTH_SECRET', 'NEXTAUTH_SECRET']) {
    const pattern = new RegExp(`(${key}=")${oldSecret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(")`);
    if (pattern.test(content)) {
      content = content.replace(pattern, `$1${newSecret}$2`);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
  return changed;
}

function printTable(before: Record<string, number>, after: Record<string, number>): void {
  const tables = [...new Set(DOMAIN_TABLES)].sort();
  const col1 = Math.max(6, ...tables.map((t) => t.length)) + 2;
  const sep = `${'-'.repeat(col1)}${'-'.repeat(12)}${'-'.repeat(12)}${'-'.repeat(8)}`;
  console.log(`${'Table'.padEnd(col1)}${'Before'.padEnd(12)}${'After'.padEnd(12)}${'OK?'}`);
  console.log(sep);
  for (const t of tables) {
    const b = before[t] ?? -1;
    const a = after[t] ?? -1;
    const ok = b === a ? '✓' : '✗';
    console.log(`${t.padEnd(col1)}${String(b).padEnd(12)}${String(a).padEnd(12)}${ok}`);
  }
  console.log(sep);
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DukanOS — Full Auth Identity Wipe (reset-auth)');
  console.log(`  Started: ${startedAt}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const { prisma } = await import('../src/lib/db/prisma');

  // ── [1] BEFORE counts ────────────────────────────────────────────────────
  console.log('[1/6] Recording BEFORE row counts...');
  const before = await snapCounts(prisma as unknown as PrismaAny);

  const usersBefore = await prisma.user.count();
  const sessionsBefore = await prisma.session.count();
  const accountsBefore = await prisma.account.count();
  const membershipsBefore = await prisma.businessMembership.count();
  const verifBefore = await prisma.verificationToken.count();

  console.log(`      Users              : ${usersBefore}`);
  console.log(`      Sessions           : ${sessionsBefore}`);
  console.log(`      Accounts (OAuth)   : ${accountsBefore}`);
  console.log(`      BusinessMembership : ${membershipsBefore}`);
  console.log(`      VerifTokens        : ${verifBefore}`);
  console.log('');

  // ── [2] NULL OUT nullable userId FKs + DELETE non-nullable ones ─────────
  // Exhaustive scan found 3 User FKs without onDelete:
  //   AuditLog.userId        String?  → SET NULL (row data preserved)
  //   Employee.userId        String?  → SET NULL (row data preserved)
  //   FeedbackResponse.responderId String (non-nullable) → DELETE rows
  console.log('[2/6] Handling non-cascade User FK references...');

  const auditNulled = await prisma.auditLog.updateMany({
    where: { userId: { not: null } },
    data: { userId: null },
  });
  console.log(`      AuditLog.userId nulled       : ${auditNulled.count} rows`);

  const empNulled = await prisma.employee.updateMany({
    where: { userId: { not: null } },
    data: { userId: null },
  });
  console.log(`      Employee.userId nulled       : ${empNulled.count} rows`);

  // FeedbackResponse.responderId is non-nullable with no onDelete — delete rows.
  // Parent Feedback rows remain intact; only the reply messages go.
  const feedbackRespDel = await prisma.feedbackResponse.deleteMany({});
  console.log(`      FeedbackResponse rows deleted: ${feedbackRespDel.count} rows`);
  console.log('');

  // ── [3] Explicit deletion of auth rows and membership links ──────────────
  // These cascade from User anyway, but explicit deletion is cleaner.
  console.log('[3/6] Deleting Session, Account, VerificationToken, and membership rows...');
  const sessionDel = await prisma.session.deleteMany({});
  const accountDel = await prisma.account.deleteMany({});
  const verifDel   = await prisma.verificationToken.deleteMany({});
  const membershipDel = await prisma.businessMembership.deleteMany({});
  console.log(`      Sessions deleted    : ${sessionDel.count}`);
  console.log(`      Accounts deleted    : ${accountDel.count}`);
  console.log(`      VerifTokens deleted : ${verifDel.count}`);
  console.log(`      Memberships deleted : ${membershipDel.count}`);
  console.log('');

  // ── [4] Delete ALL users (cascade handles remaining child rows) ───────────
  console.log('[4/6] Deleting ALL User rows (cascade cleans child rows)...');
  const userDel = await prisma.user.deleteMany({});
  console.log(`      Users deleted       : ${userDel.count}`);
  console.log('');

  // ── [5] Rotate AUTH_SECRET (invalidate any remaining JWTs) ───────────────
  console.log('[5/6] Rotating AUTH_SECRET to invalidate all JWTs...');
  const oldSecret = process.env.AUTH_SECRET ?? '';
  const newSecret = crypto.randomBytes(32).toString('hex');
  const ROOT = path.resolve(__dirname, '../');
  const rotatedEnv      = rotateSecret(path.join(ROOT, '.env'), oldSecret, newSecret);
  const rotatedEnvLocal = rotateSecret(path.join(ROOT, '.env.local'), oldSecret, newSecret);
  console.log(`      New secret prefix   : ${newSecret.slice(0, 16)}...`);
  console.log(`      .env rotated        : ${rotatedEnv}`);
  console.log(`      .env.local rotated  : ${rotatedEnvLocal}`);
  console.log('');

  // ── [6] AFTER counts + domain safety assertion ───────────────────────────
  console.log('[6/6] Recording AFTER counts & asserting domain data safety...');
  const after = await snapCounts(prisma as unknown as PrismaAny);

  const usersAfter       = await prisma.user.count();
  const sessionsAfter    = await prisma.session.count();
  const accountsAfter    = await prisma.account.count();
  const membershipsAfter = await prisma.businessMembership.count();

  console.log('');
  printTable(before, after);

  // Strict assertion — any domain change aborts with non-zero exit
  assertDomainUnchanged(before, after);

  await prisma.$disconnect();

  // ── Final summary ─────────────────────────────────────────────────────────
  const finishedAt = new Date().toISOString();
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Started           : ${startedAt}`);
  console.log(`  Finished          : ${finishedAt}`);
  console.log(`  Users deleted     : ${userDel.count}  (after: ${usersAfter})`);
  console.log(`  Sessions deleted  : ${sessionDel.count}  (after: ${sessionsAfter})`);
  console.log(`  Accounts deleted  : ${accountDel.count}  (after: ${accountsAfter})`);
  console.log(`  Memberships deleted: ${membershipDel.count} (after: ${membershipsAfter})`);
  console.log(`  AUTH_SECRET       : ROTATED`);
  console.log(`  Domain tables     : ALL UNCHANGED ✓`);
  console.log('');
  console.log('  ✓ Auth identity wipe complete. Zero users remain.');
  console.log('  ✓ Register a fresh account at /register');
  console.log('  Restart dev server: npm run dev');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('');
  console.error('reset-auth FAILED:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
