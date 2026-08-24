export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/config/env');
    try {
      validateEnv();
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[instrumentation] FATAL: production environment validation failed.');
        console.error('[instrumentation]', err instanceof Error ? err.message : String(err));
        process.exit(1);
      } else {
        console.warn('[instrumentation] Environment validation warning (dev):', err instanceof Error ? err.message : String(err));
      }
    }
  }
}
