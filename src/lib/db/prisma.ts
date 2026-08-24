import 'server-only'
import { PrismaClient } from '@/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const rawDatabaseUrl = process.env.DATABASE_URL

if (typeof rawDatabaseUrl !== 'string' || rawDatabaseUrl.trim().length === 0) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[prisma] FATAL: DATABASE_URL is not configured in production.')
    console.error('[prisma] Application startup is failing fast. Configure DATABASE_URL and restart.')
    throw new Error('DATABASE_URL is not configured.')
  }
  console.warn('[prisma] DATABASE_URL is missing. Falling back to localhost for development only.')
}

const connectionString = typeof rawDatabaseUrl === 'string' && rawDatabaseUrl.trim().length > 0
  ? rawDatabaseUrl
  : 'postgresql://localhost:5432/dukaanos'

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
