import 'server-only';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logging/logger';

export interface JobDefinition {
  id: string;
  name: string;
  run: (context: JobContext) => Promise<JobResult>;
}

export interface JobContext {
  jobId: string;
  businessId?: string;
  attempt: number;
  metadata?: Record<string, unknown>;
  logger: typeof logger;
}

export interface JobResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface JobRecord {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  attempt: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class JobRunner {
  private readonly running: Map<string, JobRecord>;

  constructor() {
    this.running = new Map();
  }

  async runJob(definition: JobDefinition, options?: { businessId?: string; metadata?: Record<string, unknown>; maxAttempts?: number }): Promise<JobRecord> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const businessId = options?.businessId;
    const metadata = options?.metadata;

    const existing = this.running.get(definition.id);
    if (existing) {
      return existing;
    }

    const record: JobRecord = {
      id: randomUUID(),
      name: definition.name,
      status: 'pending',
      startedAt: new Date(),
      attempt: 1,
      metadata,
    };

    this.running.set(definition.id, record);

    try {
      record.status = 'running';
      logger.info('Job started', {
        category: 'JOB',
        jobId: definition.id,
        jobName: definition.name,
        businessId,
        attempt: record.attempt,
        metadata,
      });

      let lastError: string | undefined;
      let attempt = 1;

      while (attempt <= maxAttempts) {
        const context: JobContext = {
          jobId: definition.id,
          businessId,
          attempt,
          metadata,
          logger,
        };

        try {
          const result = await definition.run(context);

          if (result.success) {
            record.status = 'completed';
            record.completedAt = new Date();
            record.attempt = attempt;
            record.metadata = result.metadata;

            logger.info('Job completed successfully', {
              category: 'JOB',
              jobId: definition.id,
              jobName: definition.name,
              businessId,
              attempt,
              metadata: result.metadata,
            });

            this.running.delete(definition.id);
            return record;
          }

          lastError = result.error;
          record.error = lastError;

          logger.warn('Job attempt failed', {
            category: 'JOB',
            jobId: definition.id,
            jobName: definition.name,
            businessId,
            attempt,
            error: lastError,
            metadata: result.metadata,
          });
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          record.error = lastError;

          logger.warn('Job attempt threw error', {
            category: 'JOB',
            jobId: definition.id,
            jobName: definition.name,
            businessId,
            attempt,
            error: lastError,
          });
        }

        attempt++;
        if (attempt <= maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      record.status = 'failed';
      record.completedAt = new Date();
      record.attempt = attempt - 1;

      logger.error('Job failed after max attempts', {
        category: 'JOB',
        jobId: definition.id,
        jobName: definition.name,
        businessId,
        attempts: attempt - 1,
        maxAttempts,
        error: lastError,
        metadata,
      });

      this.running.delete(definition.id);
      return record;
    } catch (err) {
      record.status = 'failed';
      record.completedAt = new Date();
      record.error = err instanceof Error ? err.message : String(err);

      logger.error('Job runner encountered unexpected error', {
        category: 'JOB',
        jobId: definition.id,
        jobName: definition.name,
        businessId,
        attempt: record.attempt,
        error: record.error,
      });

      this.running.delete(definition.id);
      return record;
    }
  }
}
