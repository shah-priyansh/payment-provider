import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationContext {
  correlationId: string;
  userId?: string;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export function getCorrelationContext(): CorrelationContext {
  return correlationStorage.getStore() ?? { correlationId: 'unknown' };
}
