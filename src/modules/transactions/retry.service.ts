import { Injectable } from '@nestjs/common';

const RETRYABLE_ERRORS = new Set(['NETWORK_TIMEOUT', 'RATE_LIMIT_EXCEEDED']);
const MAX_ATTEMPTS = 3;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const JITTER = 500;

@Injectable()
export class RetryService {
  isRetryable(errorCode: string): boolean {
    return RETRYABLE_ERRORS.has(errorCode);
  }

  calculateDelay(attempt: number): number {
    const exponential = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
    return exponential + Math.random() * JITTER;
  }

  canRetry(retryCount: number): boolean {
    return retryCount < MAX_ATTEMPTS;
  }
}
