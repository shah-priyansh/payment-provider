import { MockBankService } from './mock-bank.service';

describe('MockBankService', () => {
  let service: MockBankService;
  beforeEach(() => { service = new MockBankService(); });

  it('returns authCode on success result', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01);
    const result = await service.authorize('4532015112830366', '100.00', 'USD');
    expect(result.success).toBe(true);
    expect(result.authCode).toMatch(/^AUTH_/);
    jest.restoreAllMocks();
  });

  it('returns INSUFFICIENT_FUNDS for roll in 0.85–0.93 range', async () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.86)
      .mockReturnValue(0);
    const result = await service.authorize('4532015112830366', '100.00', 'USD');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INSUFFICIENT_FUNDS');
    jest.restoreAllMocks();
  });

  it('returns NETWORK_TIMEOUT for roll in 0.95–0.97 range', async () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.96)
      .mockReturnValue(0);
    const result = await service.authorize('4532015112830366', '100.00', 'USD');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NETWORK_TIMEOUT');
    jest.restoreAllMocks();
  });

  it('success rate is approximately 85% over 1000 calls', async () => {
    jest.spyOn(service as any, 'simulateDelay').mockResolvedValue(undefined);
    let successes = 0;
    for (let i = 0; i < 1000; i++) {
      const r = await service.authorize('4532015112830366', '100.00', 'USD');
      if (r.success) successes++;
    }
    expect(successes).toBeGreaterThan(800);
    expect(successes).toBeLessThan(900);
  }, 15000);
});
