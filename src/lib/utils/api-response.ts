import 'server-only';

import { ErrorCodes, type ErrorCode } from '@/lib/errors/error-codes';
import { AppError } from '@/lib/errors/app-error';

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
  return { success: false, errorCode, message, fieldErrors };
}

export function createErrorFromAppError(error: AppError): ActionResponse {
  return {
    success: false,
    errorCode: error.code,
    message: error.message,
    fieldErrors: error.metadata?.fieldErrors as Record<string, string[]> | undefined,
  };
}
