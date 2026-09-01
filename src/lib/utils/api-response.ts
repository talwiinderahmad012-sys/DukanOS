import { ErrorCodes, type ErrorCode } from '@/lib/errors/error-codes';
import { AppError, sanitizeErrorMessage } from '@/lib/errors/app-error';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export { ErrorCodes as AppErrors, type ErrorCode };

export function createSuccess<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function createError(
  errorCode: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionResponse {
  // Internal errors must never leak raw infrastructure details (SQL, Prisma,
  // connection strings) to the client. Sanitize centrally so every server
  // action catch-block is covered even when it forwards err.message.
  const clientMessage =
    errorCode === ErrorCodes.INTERNAL_ERROR ? sanitizeErrorMessage(message) : message;
  return { success: false, errorCode, message: clientMessage, fieldErrors };
}

export function createErrorFromAppError(error: AppError): ActionResponse {
  return {
    success: false,
    errorCode: error.code,
    message: error.message,
    fieldErrors: error.metadata?.fieldErrors as Record<string, string[]> | undefined,
  };
}

/**
 * Map a thrown error caught at a server-action boundary to an ActionResponse
 * (P3-07). Structured AppError codes/messages are preserved across the
 * boundary (UNAUTHORIZED stays UNAUTHORIZED, RATE_LIMITED stays RATE_LIMITED,
 * etc.) instead of being flattened to INTERNAL_ERROR. Unknown errors collapse
 * to INTERNAL_ERROR whose message is sanitized centrally by createError, so
 * stack traces and infrastructure details never reach the client.
 */
export function actionError(err: unknown, fallbackMessage: string): ActionResponse {
  if (err instanceof AppError) {
    return createErrorFromAppError(err);
  }
  const message = err instanceof Error && err.message ? err.message : fallbackMessage;
  return createError(ErrorCodes.INTERNAL_ERROR, message);
}
