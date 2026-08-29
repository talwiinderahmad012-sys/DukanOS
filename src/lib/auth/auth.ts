import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
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
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === 'string' ? normalizeEmail(credentials.email) : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password) {
          return null
        }

        const clientIp = getClientIp(request);

        try {
          await enforceRateLimit('LOGIN', clientIp)
        } catch (rateLimitError) {
          await recordAuthAudit({
            userId: null,
            action: 'LOGIN_RATE_LIMITED',
            metadata: { email, ip: clientIp },
          })
          const err = rateLimitError instanceof Error ? rateLimitError : new Error('Rate limited');
          throw err
        }

        let user;
        try {
          user = await prisma.user.findFirst({
            where: {
              email: {
                equals: email,
                mode: 'insensitive',
              },
            },
          })
        } catch (error) {
          console.error("[AUTH] Database connection failed during authorize():", error instanceof Error ? error.message : "Unknown error");
          throw new Error("ServiceUnavailable");
        }

        if (!user || !user.password) {
          await recordAuthAudit({
            userId: user?.id ?? null,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'user_not_found', email },
          })
          return null
        }

        const isValid = await bcrypt.compare(
          password,
          user.password
        )

        if (!isValid) {
          await recordAuthAudit({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'invalid_password', email },
          })
          return null
        }

        await recordAuthAudit({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          metadata: { email },
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
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }

      if (!token.sub) return token

      return token
    }
  }
})
