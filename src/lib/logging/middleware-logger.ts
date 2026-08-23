import { randomUUID } from 'crypto';

export function createCorrelationId(request?: Request): string {
  if (request) {
    const correlationId = request.headers.get('x-request-id') || request.headers.get('x-correlation-id');
    if (correlationId) {
      return correlationId;
    }
  }
  return randomUUID();
}
