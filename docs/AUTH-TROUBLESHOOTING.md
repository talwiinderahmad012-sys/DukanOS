# DukaanOS — Auth & Login Troubleshooting

Symptom: `Invalid email or password` on login.

Stack: Next.js 16 · Auth.js v5 (next-auth beta) · Prisma 7 · PostgreSQL 16.

---

## 1. What "Invalid email or password" means

The Credentials provider `authorize()` returns `null` (which Auth.js maps to this
message) only when:

- no user matches the identifier (case-insensitive), or
- the user row has no password (social/imported account), or
- the bcrypt password comparison fails.

Database/connection failures are *never* reported as "Invalid email or password".
If PostgreSQL is unreachable the login page shows the dedicated
"service unavailable" message (`auth.serviceUnavailable`), which distinguishes an
infrastructure problem from bad credentials.

---

## 2. Supported login identifiers

A single canonical field `identifier` accepts BOTH:

- an email address, or
- a username.

Matching is case-insensitive and the identifier is trimmed before lookup.
The form label is "Email or Username" (`auth.identifierLabel`) but the backend
only ever reads `identifier` — there is no separate `email`/`username` credential
field (no conflicting names). See `src/lib/auth/auth.ts`.

---

## 3. Safe diagnosis (no debug logs)

Temporary `[AUTH-DEBUG]` console logging has been removed. Use the safe, automated
checkers instead — they never print passwords, hashes, cookies, or connection
strings:

```bash
npm run test:db       # PostgreSQL availability (DB health gate)
npm run test:auth     # full authorized-flow regression suite
npm run test:qa       # whole-app QA orchestration
```

If PostgreSQL is down, the suites report `BLOCKED — DATABASE UNAVAILABLE`
(infrastructure), not a code failure.

### Manual checks (safe)

```powershell
Get-Service -Name *postgres*     # Status should be Running, StartType Automatic
pg_isready -h localhost -p 5432  # "accepting connections"
$env:AUTH_SECRET.Length          # must be >= 32 and identical in .env/.env.local
```

Never print `.env`/`.env.local` values to logs, terminals you do not control, or
screenshots: they contain secrets.

---

## 4. Correct recovery steps

1. **PostgreSQL isn’t running** → `pwsh scripts/start-postgresql.ps1` (Admin).
2. **Database reachable but login still fails** → verify the account exists and its
   password is correct by attempting a password reset, or register a fresh account
   (`/register`). Registration uses bcrypt (cost 10) and stores only the hash.
3. **Session lost after restart** → `AUTH_SECRET` must be stable.
   `session.strategy = "jwt"` (30-day maxAge) means sessions survive restarts as
   long as the secret never changes. Changing `AUTH_SECRET` invalidates all sessions
   once — keep it stable.
4. **Prisma client missing** → `npm run prisma:generate` (also runs on
   `postinstall`). `npm run build` does not need to regenerate; generation is
   deterministic and incremental.

---

## 5. Automated registration

Registration runs inside one server action (`registerAndSignInAction`): it creates
user + business + branch + OWNER membership inside a single Prisma transaction,
then performs a server-side credentials sign-in. A successfully registered user
enters the dashboard immediately without a second manual login.

Duplicates (email or username) are rejected case-insensitively, and database
outages surface as a temporary-unavailable message — never a fabricated failure.

---

## 6. Still failing?

1. Confirm `npm run test:db` reports `DATABASE_AVAILABLE`.
2. Confirm `npm run test:auth` passes (it exercises email login, username login,
   case/trim normalization, wrong-password rejection, registration, and DB-down
   behaviour using isolated throwaway rows only).
3. Restart the dev server so any `.env.local` changes are picked up.
4. If everything passes but the browser is stale, hard-refresh once
   (`Ctrl+Shift+R`); the app itself is deterministic about field names and keys.