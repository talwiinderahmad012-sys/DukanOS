import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { enforceRateLimit } from "@/lib/security/rate-limit-action"
import { recordAuthAudit } from "@/services/audit"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          await enforceRateLimit('LOGIN', String(credentials.email))
        } catch {
          // Rate-limited: reject before any authentication/DB work. The audit
          // event is preserved through recordAuthAudit's structured-log path
          // (userId null => no database queries on the rejected request).
          await recordAuthAudit({
            userId: null,
            action: 'LOGIN_RATE_LIMITED',
            metadata: { email: String(credentials.email) },
          })
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          await recordAuthAudit({
            userId: user?.id ?? null,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'user_not_found', email: String(credentials.email) },
          })
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
          await recordAuthAudit({
            userId: user.id,
            action: 'LOGIN_FAILED',
            metadata: { reason: 'invalid_password', email: String(credentials.email) },
          })
          return null
        }

        await recordAuthAudit({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          metadata: { email: String(credentials.email) },
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
    async signOut({ token, session }: { token?: any; session?: any }) {
      const userId = session?.user?.id || token?.sub;
      if (userId) {
        await recordAuthAudit({
          userId,
          action: 'LOGOUT',
          metadata: { email: session?.user?.email || token?.email },
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
      return token
    }
  }
})
