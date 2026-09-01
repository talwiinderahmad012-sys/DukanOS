# DukaanOS — Auth Login Troubleshooting & One-Command Recovery

**Symptom:** `Invalid email or password` every time you reboot Windows and try to
log in with `ahmad`.

Stack: Next.js 16 · Auth.js v5 (next-auth beta) · Prisma 7 · PostgreSQL 16 (native, Windows service).

---

## 0. The ONE-COMMAND fix (run as Administrator, from project root)

```powershell
pwsh scripts/fix-auth-everything.ps1
```

This single script: starts PostgreSQL + sets it to auto-start, ensures a **stable**
`AUTH_SECRET`, regenerates the Prisma client, applies migrations, and creates/repairs
the `ahmad` account with password `password123`.

After it finishes, **restart the dev server** (`Ctrl+C` then `npm run dev`) and log in.

---

## 1. What was actually wrong

The error `Invalid email or password` is returned by the **Credentials provider**
`authorize()` when it returns `null` — i.e. the user row is missing / has no password /
or the password does not match. It is **not** the "database unavailable" path (that
shows a different message). That tells us:

- ✅ The DB connection itself works (so `DATABASE_URL` is fine — keep the `postgres:ahmad` password).
- ❌ The most likely real causes are: (a) PostgreSQL not running after reboot, and
  (b) the `ahmad` account missing or with the wrong password.

Two things were already correct and were left alone:
- `AUTH_SECRET` is a **fixed** value in `.env` (it does **not** regenerate on restart).
- `session.strategy = "jwt"` with `maxAge = 30 days` (sessions survive restarts).

> NOTE: The local `DATABASE_URL` password is `ahmad`, **not** `postgres`. Do not
> "fix" it to `postgres:postgres` — that would break the connection. (The Docker
> Compose DB uses `postgres:postgres`; the native Windows service uses `ahmad`.)

---

## 2. Manual diagnostic checklist

### 2.1 PostgreSQL running + auto-start
```powershell
pwsh scripts/start-postgresql.ps1
# or manually:
Get-Service -Name *postgres*          # should be Status=Running, StartType=Automatic
pg_isready -h localhost -p 5432       # should print "accepting connections"
```

### 2.2 Env vars loaded
```bash
cat .env.local      # AUTH_SECRET + DATABASE_URL must be present
cat .env            # fallback source
```
Next.js loads `.env.local` (highest priority) and `.env`. Prisma CLI loads `.env`
(and now `.env.local` too — see `prisma.config.ts`).

### 2.3 AUTH_SECRET stable across restarts
AUTH_SECRET is a hardcoded string in `.env`/`.env.local`. It never changes between
boots. To confirm it did not change: compare the value before/after a reboot — it will
be identical. If you ever regenerate it, **all existing sessions are invalidated once**
(users must re-log-in), then it stays stable.

### 2.4 User exists
```bash
npx tsx scripts/show-credentials.ts
# or
npx tsx scripts/bootstrap-ahmad-user.ts   # creates ahmad/password123 if missing
```

### 2.5 Prisma client generated
```bash
npx prisma generate
npx prisma validate
```

---

## 3. Debug logging (added temporarily)

To see exactly where auth fails, these temporary logs were added (remove after fixing):

- `src/app/(auth)/login/page.tsx` — logs submitted `identifier`, and the `signIn()`
  result (`error`/`status`/`url`).
- `src/lib/auth/auth.ts` — logs inside `authorize()`: the `identifier`, whether a user
  was found and has a password, and the `bcrypt.compare` result (`isValid`).

Open the browser DevTools console and the Next.js server terminal; search for
`[AUTH-DEBUG]`.

---

## 4. Credentials you can log in with

```
username : ahmad
email    : ahmad@test.com
password : password123
```

---

## 5. Scripts reference

| Script | Purpose |
|--------|---------|
| `scripts/start-postgresql.ps1` | Start PostgreSQL + set auto-start (Admin) |
| `scripts/bootstrap-ahmad-user.ts` | Create/repair `ahmad` (password123) |
| `scripts/fix-auth-everything.ps1` | Run all fixes in one command (Admin) |
| `scripts/verify-setup.sh` | Health check: PG up, ahmad exists, secret stable, client generated |
| `scripts/test-auth-persistence.ts` | Verifies login works + session survives restart |
| `scripts/show-credentials.ts` | Print all users + test credentials |

---

## 6. If it STILL fails after the one-command fix

1. Open DevTools console on the login page — note the `[AUTH-DEBUG]` line:
   - `user lookup { found: false }` → DB has no `ahmad`; re-run bootstrap.
   - `user lookup { found: true, hasPassword: false }` → password column empty; re-run bootstrap.
   - `password compare { isValid: false }` → wrong password; re-run bootstrap.
   - `authorize() ... hasSecret: false` → `AUTH_SECRET` not loaded; check `.env.local`.
2. Confirm PostgreSQL is actually up: `pg_isready -h localhost -p 5432`.
3. Restart the dev server so it picks up the new `.env.local`.
