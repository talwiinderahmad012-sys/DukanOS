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
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password) {
          return null
        }

        try {
          await enforceRateLimit('LOGIN', email)
        } catch {
          // Rate-limited: reject before any authentication/DB work. The audit
          // event is preserved through recordAuthAudit's structured-log path
          // (userId null => no database queries on the rejected request).
          await recordAuthAudit({
            userId: null,
            action: 'LOGIN_RATE_LIMITED',
            metadata: { email },
          })
          return null
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
          // Log the actual error safely on the server side
          console.error("[AUTH] Database connection failed during authorize():", error instanceof Error ? error.message : "Unknown error");
          // Throw a generic error to the client, preventing NextAuth from swallowing it as "CredentialsSignin"
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
