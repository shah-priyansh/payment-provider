import { LuhnService } from './luhn.service';

describe('LuhnService', () => {
  let service: LuhnService;
  beforeEach(() => { service = new LuhnService(); });

  it('returns true for valid Visa test number', () => {
    expect(service.validate('4532015112830366')).toBe(true);
  });

  it('returns true for valid Mastercard test number', () => {
    expect(service.validate('5425233430109903')).toBe(true);
  });

  it('returns false for invalid number', () => {
    expect(service.validate('1234567890123456')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(service.validate('')).toBe(false);
  });

  it('strips spaces and dashes before validating', () => {
    expect(service.validate('4532-0151-1283-0366')).toBe(true);
  });

  it('returns false for non-numeric input', () => {
    expect(service.validate('453201511283036X')).toBe(false);
  });
});
