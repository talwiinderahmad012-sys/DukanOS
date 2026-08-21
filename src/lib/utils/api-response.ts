import 'server-only';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const AppErrors = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONFLICT: 'CONFLICT',
  BUSINESS_ACCESS_DENIED: 'BUSINESS_ACCESS_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export function createSuccess<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function createError(
  errorCode: keyof typeof AppErrors,
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionResponse {
  return { success: false, errorCode, message, fieldErrors };
}
