import 'server-only'

interface AppConfig {
  databaseUrl: string
  authSecret: string
  nextAuthSecret: string | null
  nextAuthUrl: string | null
  appUrl: string
  cronSecret: string
  vapidPublicKey: string | null
  vapidPrivateKey: string | null
  vapidSubject: string | null
  nodeEnv: string
  port: number
}

let cachedConfig: AppConfig | null = null

export function validateEnv(): AppConfig {
  if (cachedConfig) return cachedConfig

  const missingRequired: string[] = []

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) missingRequired.push('DATABASE_URL')

  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) missingRequired.push('AUTH_SECRET')

  const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? null
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? null
  if (!nextAuthSecret && !nextAuthUrl) {
    missingRequired.push('NEXTAUTH_SECRET or NEXTAUTH_URL')
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? null
  if (!appUrl) missingRequired.push('APP_URL or NEXT_PUBLIC_APP_URL')

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) missingRequired.push('CRON_SECRET')

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingRequired.join(', ')}`,
    )
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? null
  const vapidSubject = process.env.VAPID_SUBJECT ?? null

  if (!vapidPublicKey) console.warn('Warning: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
  if (!vapidPrivateKey) console.warn('Warning: VAPID_PRIVATE_KEY is not set')
  if (!vapidSubject) console.warn('Warning: VAPID_SUBJECT is not set')

  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const port = Number(process.env.PORT ?? 3000)

  cachedConfig = {
    databaseUrl: databaseUrl!,
    authSecret: authSecret!,
    nextAuthSecret,
    nextAuthUrl,
    appUrl: appUrl!,
    cronSecret: cronSecret!,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
    nodeEnv,
    port,
  }

  return cachedConfig
}

export type { AppConfig }
