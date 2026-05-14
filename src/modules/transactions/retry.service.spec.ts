import { RetryService } from './retry.service';

describe('RetryService', () => {
  let service: RetryService;
  beforeEach(() => { service = new RetryService(); });

  describe('isRetryable', () => {
    it('returns true for NETWORK_TIMEOUT', () => {
      expect(service.isRetryable('NETWORK_TIMEOUT')).toBe(true);
    });
    it('returns true for RATE_LIMIT_EXCEEDED', () => {
      expect(service.isRetryable('RATE_LIMIT_EXCEEDED')).toBe(true);
    });
    it('returns false for INSUFFICIENT_FUNDS', () => {
      expect(service.isRetryable('INSUFFICIENT_FUNDS')).toBe(false);
    });
    it('returns false for INVALID_CARD', () => {
      expect(service.isRetryable('INVALID_CARD')).toBe(false);
    });
    it('returns false for CARD_EXPIRED', () => {
      expect(service.isRetryable('CARD_EXPIRED')).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('attempt 0: delay is between 1000 and 1500ms', () => {
      for (let i = 0; i < 20; i++) {
        const d = service.calculateDelay(0);
        expect(d).toBeGreaterThanOrEqual(1000);
        expect(d).toBeLessThanOrEqual(1500);
      }
    });
    it('attempt 1: delay is between 2000 and 2500ms', () => {
      for (let i = 0; i < 20; i++) {
        const d = service.calculateDelay(1);
        expect(d).toBeGreaterThanOrEqual(2000);
        expect(d).toBeLessThanOrEqual(2500);
      }
    });
    it('caps at maxDelay of 30000ms', () => {
      const d = service.calculateDelay(10);
      expect(d).toBeLessThanOrEqual(30500);
    });
  });

  describe('canRetry', () => {
    it('returns true when retryCount < 3', () => {
      expect(service.canRetry(2)).toBe(true);
    });
    it('returns false when retryCount >= 3', () => {
      expect(service.canRetry(3)).toBe(false);
    });
  });
});
