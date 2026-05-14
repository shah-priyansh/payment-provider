import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class CardTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async tokenize(cardId: string, userId: string): Promise<{ token: string }> {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card || !card.isActive) throw new NotFoundException('Card not found');
    if (card.userId !== userId) throw new ForbiddenException();

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const created = await this.prisma.cardToken.create({
      data: { cardId, userId, token, expiresAt },
      select: { token: true },
    });
    return created;
  }

  async validateToken(token: string, userId: string) {
    const cardToken = await this.prisma.cardToken.findUnique({ where: { token } });
    if (!cardToken || !cardToken.isActive) throw new UnauthorizedException('Invalid token');
    if (cardToken.expiresAt < new Date()) throw new UnauthorizedException('Token expired');
    if (cardToken.userId !== userId) throw new UnauthorizedException('Token does not belong to user');
    return cardToken;
  }
}
