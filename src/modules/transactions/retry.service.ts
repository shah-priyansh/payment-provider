import { Injectable } from '@nestjs/common';

// retryable errors are transient network/infra issues — business errors like insufficient funds should NOT be retried
const RETRYABLE_ERRORS = new Set(['NETWORK_TIMEOUT', 'RATE_LIMIT_EXCEEDED']);

@Injectable()
export class RetryService {
  isRetryable(errorCode: string): boolean {
    return RETRYABLE_ERRORS.has(errorCode);
  }

  calculateDelay(attempt: number): number {
    // exponential backoff capped at 30s + small random jitter to avoid thundering herd
    const base = Math.min(1000 * Math.pow(2, attempt), 30000);
    return base + Math.random() * 500;
  }

  canRetry(retryCount: number): boolean {
    return retryCount < 3;
  }
}
