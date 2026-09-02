import 'server-only'
import { PrismaClient } from '@/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient(): PrismaClient {
  const rawDatabaseUrl = process.env.DATABASE_URL

  if (typeof rawDatabaseUrl !== 'string' || rawDatabaseUrl.trim().length === 0) {
    throw new Error(
      '[prisma] FATAL: DATABASE_URL is not configured.\n' +
      'Set it in .env.local (e.g. postgresql://postgres:postgres@localhost:5432/dukaanos)\n' +
      'and restart the process. Refusing to start with a credential-less fallback.'
    )
  }

  const pool = new Pool({ connectionString: rawDatabaseUrl })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
