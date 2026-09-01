#!/usr/bin/env bash
# verify-setup.sh — DukaanOS auth/login health check (run from project root)
# Checks: PostgreSQL up, DATABASE_URL reachable, user 'ahmad' exists,
#         AUTH_SECRET stable, Prisma client generated.
set -u
NODE="${NODE:-node}"
PASS=0; FAIL=0
ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
bad()  { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "=== 1. PostgreSQL listening on 5432 ==="
if (exec 3<>/dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  exec 3>&- 3<&-
  ok "port 5432 is open"
else
  bad "port 5432 NOT listening (start Postgres: pwsh scripts/start-postgresql.ps1)"
fi

echo "=== 2. DATABASE_URL present ==="
if [ -f .env ] || [ -f .env.local ]; then
  ok ".env / .env.local present"
else
  bad "no .env file found"
fi

echo "=== 3 & 4. user 'ahmad' + AUTH_SECRET + password check (via node) ==="
"$NODE" -e '
const { config } = require("dotenv");
config({ path: ".env" });
config({ path: ".env.local", override: true });
const Module = require("module");
const orig = Module.prototype.require;
Module.prototype.require = function (id, ...a) {
  if (id === "server-only") return {};
  return orig.apply(this, [id, ...a]);
};
(async () => {
  const secret = process.env.AUTH_SECRET || "";
  if (secret.length >= 32) console.log("  [PASS] AUTH_SECRET is set and stable (len=" + secret.length + ")");
  else console.log("  [FAIL] AUTH_SECRET missing or too short");
  const { PrismaClient } = require("./src/generated/prisma/client");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const { Pool } = require("pg");
  const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });
  try {
    const u = await prisma.user.findUnique({ where: { username: "ahmad" } });
    if (!u) { console.log("  [FAIL] user ahmad does NOT exist — run: npx tsx scripts/bootstrap-ahmad-user.ts"); process.exit(0); }
    if (!u.password) { console.log("  [FAIL] user ahmad has NO password"); process.exit(0); }
    const bcrypt = require("bcryptjs");
    const okPw = await bcrypt.compare("password123", u.password);
    if (okPw) console.log("  [PASS] user ahmad exists and password123 verifies");
    else console.log("  [FAIL] user ahmad exists but password123 does NOT verify");
  } catch (e) {
    console.log("  [FAIL] DB query error: " + (e && e.message ? e.message : e));
  } finally {
    await prisma.$disconnect();
  }
})();
'
echo
echo "=== 5. Prisma client generated ==="
if [ -f src/generated/prisma/client.ts ]; then ok "src/generated/prisma/client.ts exists"; else bad "Prisma client missing — run: npx prisma generate"; fi

echo
echo "SUMMARY: PASS=$PASS FAIL=$FAIL"
