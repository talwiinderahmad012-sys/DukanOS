import { LogContext, logger } from './logger';

export function createRequestLogger(requestId: string) {
  const baseContext = { correlationId: requestId };

  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) =>
      logger.error(message, { ...baseContext, ...context }),
    logRequestCompletion: (statusCode: number, durationMs: number, context?: LogContext) =>
      logger.info('Request completed', { ...baseContext, ...context, statusCode, durationMs }),
    logError: (error: Error, context?: LogContext) =>
      logger.error(error.message, {
        ...baseContext,
        ...context,
        error: { name: error.name, message: error.message, stack: error.stack },
      }),
  };
}
