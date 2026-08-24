# DukaanOS Operations Guide

## Backup & Recovery

### PostgreSQL Backup Strategy
- **Automated backups**: Configure via your hosting provider (e.g., Supabase, Neon, Railway) or use `pg_dump` with cron.
- **Recommended schedule**: Daily full backups with point-in-time recovery (PITR) enabled.
- **Manual backup command**:
  ```bash
  pg_dump -Fc -U postgres -d dukaanos > backup_$(date +%Y%m%d).dump
  ```
- **Restore command**:
  ```bash
  pg_restore -U postgres -d dukaanos backup_20250823.dump
  ```

### Environment Recovery
1. Restore `.env` from your encrypted secrets manager.
2. Verify `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `CRON_SECRET`.
3. Run `npx prisma migrate deploy` to apply any pending migrations.
4. Run `npm run build` and `npm start`.

### Prisma Migration Recovery
- If a migration fails mid-deploy, rollback using `npx prisma migrate resolve --rolled-back <migration_name>`.
- Keep migration history in version control.
- Test migrations on a staging database before production deploy.

### Deployment Rollback
1. `git revert <commit_sha>` or `git checkout <previous_tag>`.
2. `npm run build`.
3. Restart the application server.
4. If database schema changed, ensure migrations are rolled back first.

### Disaster Recovery Procedure
1. **Application crash**: Restart the Node.js process. Logs are in structured JSON format.
2. **Database outage**: Fail over to read replica if configured, or restore from latest backup.
3. **Corrupted sync queue**: The offline sync queue is client-side (IndexedDB). Server-side recovery is automatic via `clientTransactionId` idempotency.
4. **Data inconsistency**: Run `npx tsx src/scripts/test_step34_reliability.ts` to verify integrity.
5. **Production deployment verification**: Run `npx tsx src/scripts/test_step38_production.ts` to execute the full production verification suite (101 checks covering environment, database, auth, financial integrity, Docker, and GitHub Actions).

### Known Build Issue
- `npm run build` may fail on Windows with `Next.js build worker exited with code: 3221226505` during static generation. This is a Node.js/Turbopack memory issue on Windows. Build on Linux CI or use `docker build` for production images.

### Handling Offline Sync Failures
- Failed syncs are tracked in the browser's IndexedDB with status `FAILED` or `CONFLICT`.
- The sync manager retries automatically when connectivity is restored.
- Repeated failures (`retryCount > 3`) are logged for manual review.
- Stock conflicts require manual resolution (customer notification + stock adjustment).

## Monitoring

### Health Endpoints
- `GET /api/health` — Basic liveness check (database connectivity, uptime, version).
- `GET /api/health/ready` — Readiness check (database + Prisma client initialization).

### System Dashboard
- `GET /dashboard/system` — Owner-only operational metrics page.
- Shows: application status, database latency, cache hit rate, offline sync summary, recent critical errors, audit activity.

### Key Metrics to Watch
- Health endpoint response time > 2s
- Cache hit rate dropping below 50%
- Repeated sync failures (> 3 retries)
- Job failure rate
- Database connection pool exhaustion

### Log Aggregation
- All logs are structured JSON with fields: `timestamp`, `level`, `message`, `correlationId`, `category`, `businessId`, `userId`, `metadata`.
- Never log: passwords, tokens, secrets, salary details, or sensitive customer PII.

## Security Operations

### Secret Rotation
1. Generate new secrets: `openssl rand -base64 32`.
2. Update `.env` with new values.
3. Restart the application.
4. Old sessions are invalidated on next request.

### Rate Limit Tuning
- Rate limits are defined in `src/lib/security/rate-limit-action.ts`.
- Adjust `RATE_LIMITS` config if legitimate traffic patterns change.
- In-memory store is per-process; for multi-instance deployments, use Redis-backed rate limiting.

### Audit Log Retention
- Audit logs are stored in the `AuditLog` table.
- Configure PostgreSQL `pg_cron` or external tooling to archive old logs if needed.
