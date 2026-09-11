import NextAuth, { CredentialsSignin } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

class RateLimitError extends CredentialsSignin {
  code = "RateLimited"
}

class ServiceUnavailableError extends CredentialsSignin {
  code = "ServiceUnavailable"
}
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { enforceRateLimit } from "@/lib/security/rate-limit-action"
import { recordAuthAudit } from "@/services/audit"
import { normalizeEmail } from "@/lib/auth/email"

function getClientIp(request: { headers: { get: (key: string) => string | null } } | undefined): string {
  if (!request?.headers) return 'unknown';
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/** Returns true when a stored hash looks like a valid bcrypt hash (length 60, correct prefix). */
function isValidBcryptHash(hash: string | null | undefined): boolean {
  if (!hash || typeof hash !== 'string') return false;
  return /^\$2[aby]?\$\d{1,2}\$[A-Za-z0-9./]{53}$/.test(hash) && hash.length === 60;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        // ── Input sanitisation ──────────────────────────────────────────────
        // Always trim + lowercase so stale browser-autofilled values with
        // accidental leading/trailing whitespace or wrong case still work.
        const identifier = typeof credentials?.identifier === 'string'
          ? credentials.identifier.trim().toLowerCase()
          : '';
        const password = typeof credentials?.password === 'string'
          ? credentials.password
          : '';

        if (!identifier || !password) {
          return null
        }

        const clientIp = getClientIp(request);

        try {
          await enforceRateLimit('LOGIN', identifier)
        } catch {
          await recordAuthAudit({
            userId: null,
            action: 'LOGIN_RATE_LIMITED',
            metadata: { identifier, ip: clientIp },
          })
          throw new RateLimitError();
        }

        // ── User lookup — hardened against DUPLICATE_AMBIGUITY ──────────────
        //
        // Root cause of the recurring "Invalid email or password" on this
        // machine: The OR query (email ILIKE | username ILIKE) returned
        // multiple rows when another user's email happened to contain the
        // word "ahmad". Prisma's findFirst() has no deterministic ordering
        // guarantee and can return a DIFFERENT row on each call.
        //
        // Fix: resolve the identifier through two independent exact lookups
        // in priority order, then apply hash-validity tiebreaking.
        let user;
        let lookupReason: string;

        try {
          const isEmail = identifier.includes('@');

          if (isEmail) {
            // Email path — single exact match
            const normalizedEmail = normalizeEmail(identifier);
            user = await prisma.user.findFirst({
              where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            });
            lookupReason = user ? 'email_exact' : 'email_not_found';
          } else {
            // Username path — exact match first, then OR fallback for
            // legacy accounts that stored the username in the email field.
            //
            // IMPORTANT: findMany + manual selection instead of findFirst
            // to safely handle the DUPLICATE_AMBIGUITY case.
            const usernameRows = await prisma.user.findMany({
              where: { username: { equals: identifier, mode: 'insensitive' } },
            });

            if (usernameRows.length === 1) {
              // Ideal: exactly one row
              user = usernameRows[0];
              lookupReason = 'username_exact';
            } else if (usernameRows.length > 1) {
              // Multiple rows with the same username (data anomaly) —
              // prefer the one with a valid full-length hash.
              const validRows = usernameRows.filter((u) => isValidBcryptHash(u.password));
              user = validRows.length > 0 ? validRows[0] : usernameRows[0];
              lookupReason = 'username_duplicate_resolved';
              console.error(
                `[AUTH] DUPLICATE_USERNAME detected for identifier="${identifier}": ` +
                `${usernameRows.length} rows found; resolved to id=${user.id.slice(0, 8)}`
              );
            } else {
              // No username match — attempt email fallback (covers accounts
              // created before username field existed).
              user = await prisma.user.findFirst({
                where: { email: { equals: identifier, mode: 'insensitive' } },
              });
              lookupReason = user ? 'email_fallback' : 'not_found';
            }
          }
        } catch (error) {
          console.error("[AUTH] Database lookup failed during authorize():", error instanceof Error ? error.message : "Unknown error");
          throw new ServiceUnavailableError();
        }

        // ── Not found ───────────────────────────────────────────────────────
        if (!user || !user.password) {
          const reason = !user ? 'user_not_found' : 'no_password_set';
          console.info(`[AUTH] LOGIN_FAILED reason=${reason} identifier="${identifier}" lookup=${lookupReason!}`);
          await recordAuthAudit({
            userId: user?.id ?? null,
            action: 'LOGIN_FAILED',
            metadata: { reason, identifier },
          })
          return null
        }

        // ── Hash validity guard ─────────────────────────────────────────────
        // A truncated hash (< 60 chars) will always fail bcrypt.compare;
        // detect it early and log clearly instead of silently returning null.
        // Capture in a local string so TS doesn't narrow to `never` inside the branch.
        const storedHash: string = user.password;
        if (!isValidBcryptHash(storedHash)) {
          const hashLen = storedHash.length;
          console.error(
            `[AUTH] LOGIN_FAILED reason=hash_invalid identifier="${identifier}" ` +
            `userId=${user.id.slice(0, 8)} hashLen=${hashLen}`
          );
          await recordAuthAudit({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'hash_invalid', identifier, hashLen },
          })
          return null
        }

        // ── Password verification ───────────────────────────────────────────
        const isValid = await bcrypt.compare(password, storedHash)

        if (!isValid) {
          console.info(
            `[AUTH] LOGIN_FAILED reason=invalid_password identifier="${identifier}" ` +
            `userId=${user.id.slice(0, 8)} lookup=${lookupReason}`
          );
          await recordAuthAudit({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'invalid_password', identifier },
          })
          return null
        }

        // ── Success ─────────────────────────────────────────────────────────
        console.info(
          `[AUTH] LOGIN_SUCCESS identifier="${identifier}" userId=${user.id.slice(0, 8)} lookup=${lookupReason}`
        );
        await recordAuthAudit({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          metadata: { identifier },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days — sessions survive restarts
    updateAge: 24 * 60 * 60,   // refresh the JWT at most once every 24h
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days — must match session.maxAge
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  events: {
    async signOut({ token, session }: { token?: unknown; session?: unknown }) {
      const sess = session as { user?: { id?: string; email?: string } } | undefined;
      const tok = token as { sub?: string; email?: string } | undefined;
      const userId = sess?.user?.id || tok?.sub;
      if (userId) {
        await recordAuthAudit({
          userId,
          action: 'LOGOUT',
          metadata: { email: sess?.user?.email || tok?.email },
        })
      }
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub && session.user) {
        // Unconditional assignments: username-only users have no email/name
        // on the token, and conditional assignment lets stale values bleed
        // across identities when a token is reused.
        //
        // The JWT surface from Auth.js is typed as a loose index signature, so
        // we read through a narrow local projection instead of relying on the
        // module augmentation (which is not guaranteed to merge in every
        // next-auth beta build).
        const tok = token as {
          id?: string | null;
          sub?: string | null;
          email?: string | null;
          name?: string | null;
          username?: string | null;
        };
        const su = session.user as {
          id: string;
          email: string | null;
          name: string | null;
          username: string | null;
        };
        su.id = tok.id ?? tok.sub ?? '';
        su.email = tok.email ?? null;
        su.name = tok.name ?? null;
        su.username = tok.username ?? null;
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        // Unconditional: username-only users may legitimately have
        // email === null / name === null — the token must reflect that
        // instead of silently inheriting a previous token's identity.
        token.id = user.id;
        token.sub = user.id;
        token.email = user.email ?? null;
        token.name = user.name ?? null;
        token.username = (user as { username?: string | null }).username ?? null;
      }

      if (!token.sub) return token

      return token
    }
  }
})
