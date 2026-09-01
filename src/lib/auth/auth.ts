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
        const identifier = typeof credentials?.identifier === 'string' ? credentials.identifier.trim() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        // [AUTH-DEBUG] temporary logging — remove after diagnosing login
        console.log('[AUTH-DEBUG] authorize() called', { identifier, hasSecret: !!process.env.AUTH_SECRET, strategy: process.env.AUTH_SECRET ? 'env' : 'missing' });

        if (!identifier || !password) {
          return null
        }

        const clientIp = getClientIp(request);

        try {
          await enforceRateLimit('LOGIN', identifier)
        } catch (rateLimitError) {
          await recordAuthAudit({
            userId: null,
            action: 'LOGIN_RATE_LIMITED',
            metadata: { identifier, ip: clientIp },
          })
          throw new RateLimitError();
        }

        let user;
        try {
          const isEmail = identifier.includes('@');
          const normalizedEmail = isEmail ? normalizeEmail(identifier) : undefined;

          user = await prisma.user.findFirst({
            where: {
              OR: [
                ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
                { username: { equals: identifier, mode: 'insensitive' as const } }
              ]
            },
          })
        } catch (error) {
          console.error("[AUTH] Database connection failed during authorize():", error instanceof Error ? error.message : "Unknown error");
          throw new ServiceUnavailableError();
        }

        // [AUTH-DEBUG] temporary logging — remove after diagnosing login
        console.log('[AUTH-DEBUG] user lookup', { found: !!user, hasPassword: !!user?.password, userId: user?.id ?? null });

        if (!user || !user.password) {
          await recordAuthAudit({
            userId: user?.id ?? null,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'user_not_found', identifier },
          })
          return null
        }

        const isValid = await bcrypt.compare(
          password,
          user.password
        )

        // [AUTH-DEBUG] temporary logging — remove after diagnosing login
        console.log('[AUTH-DEBUG] password compare', { isValid });

        if (!isValid) {
          await recordAuthAudit({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'invalid_password', identifier },
          })
          return null
        }

        await recordAuthAudit({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          metadata: { identifier },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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
        session.user.id = token.sub;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }

      if (!token.sub) return token

      return token
    }
  }
})
