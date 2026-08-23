import type { ErrorCode } from './error-codes';

const DB_ERROR_PATTERNS = [
  /prisma/i,
  /unique constraint/i,
  /foreign key constraint/i,
  /connection refused/i,
  /too many connections/i,
  /sqlstate/i,
  /sql syntax/i,
  /deadlock/i,
  /timeout expired/i,
  /econnrefused/i,
  /database error/i,
  /relation ".+?" does not exist/i,
];

const SANITIZED_MESSAGE = 'An internal database error occurred.';

export function isDatabaseError(message: string): boolean {
  return DB_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeErrorMessage(message: string): string {
  if (isDatabaseError(message)) {
    return SANITIZED_MESSAGE;
  }
  return message;
}

export interface AppErrorOptions {
  isOperational?: boolean;
  cause?: unknown;
  metadata?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;
  public override readonly cause?: unknown;

  constructor(
    code: string | ErrorCode,
    message: string,
    statusCode: number = 500,
    metadata?: Record<string, unknown>,
    isOperational: boolean = true,
    cause?: unknown,
  ) {
    super(sanitizeErrorMessage(message), { cause });
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.metadata = metadata;
    this.cause = cause;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      isOperational: this.isOperational,
      metadata: this.metadata,
    };
  }
}
