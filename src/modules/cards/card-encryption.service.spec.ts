import { CardEncryptionService } from './card-encryption.service';

const KEY = '0'.repeat(64); // 32-byte hex key for AES-256

describe('CardEncryptionService', () => {
  let service: CardEncryptionService;
  beforeEach(() => { service = new CardEncryptionService(KEY); });

  it('encrypts and decrypts a PAN correctly', () => {
    const pan = '4532015112830366';
    const encrypted = service.encrypt(pan);
    expect(service.decrypt(encrypted)).toBe(pan);
  });

  it('produces different ciphertext for same input (unique IV)', () => {
    const pan = '4532015112830366';
    const e1 = service.encrypt(pan);
    const e2 = service.encrypt(pan);
    expect(e1).not.toBe(e2);
  });

  it('encrypted format has 3 colon-separated parts', () => {
    const encrypted = service.encrypt('4532015112830366');
    expect(encrypted.split(':').length).toBe(3);
  });

  it('hashPan produces consistent SHA-256', () => {
    const pan = '4532015112830366';
    expect(service.hashPan(pan)).toBe(service.hashPan(pan));
  });

  it('hashPan produces different values for different PANs', () => {
    expect(service.hashPan('4532015112830366')).not.toBe(service.hashPan('5425233430109903'));
  });
});
