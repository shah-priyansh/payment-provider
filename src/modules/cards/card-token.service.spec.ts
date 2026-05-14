import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CardTokenService } from './card-token.service';

const mockPrisma = {
  card: { findUnique: jest.fn() },
  cardToken: { create: jest.fn(), findUnique: jest.fn() },
};

describe('CardTokenService', () => {
  let service: CardTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CardTokenService(mockPrisma as any);
  });

  it('throws NotFoundException when card does not exist', async () => {
    mockPrisma.card.findUnique.mockResolvedValue(null);
    await expect(service.tokenize('card-1', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when card belongs to different user', async () => {
    mockPrisma.card.findUnique.mockResolvedValue({ id: 'card-1', userId: 'user-2', isActive: true });
    await expect(service.tokenize('card-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('returns a token on success', async () => {
    mockPrisma.card.findUnique.mockResolvedValue({ id: 'card-1', userId: 'user-1', isActive: true });
    mockPrisma.cardToken.create.mockResolvedValue({ token: 'abc123' });
    const result = await service.tokenize('card-1', 'user-1');
    expect(result.token).toBe('abc123');
  });

  it('throws UnauthorizedException when token does not exist', async () => {
    mockPrisma.cardToken.findUnique.mockResolvedValue(null);
    await expect(service.validateToken('nonexistent', 'user-1')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is inactive', async () => {
    mockPrisma.cardToken.findUnique.mockResolvedValue({
      token: 'tok', userId: 'user-1', isActive: false, expiresAt: new Date(Date.now() + 1000),
    });
    await expect(service.validateToken('tok', 'user-1')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for expired token', async () => {
    mockPrisma.cardToken.findUnique.mockResolvedValue({
      token: 'tok', userId: 'user-1', isActive: true, expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.validateToken('tok', 'user-1')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for token belonging to different user', async () => {
    mockPrisma.cardToken.findUnique.mockResolvedValue({
      token: 'tok', userId: 'user-2', isActive: true, expiresAt: new Date(Date.now() + 1000),
    });
    await expect(service.validateToken('tok', 'user-1')).rejects.toThrow(UnauthorizedException);
  });
});
