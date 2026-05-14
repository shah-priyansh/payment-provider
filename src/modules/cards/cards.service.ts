import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LuhnService } from './luhn.service';
import { CardEncryptionService } from './card-encryption.service';

@Injectable()
export class CardsService {
  private readonly encryption: CardEncryptionService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly luhn: LuhnService,
    private readonly config: ConfigService,
  ) {
    this.encryption = new CardEncryptionService(
      this.config.get<string>('card.encryptionKey')!,
    );
  }

  async addCard(
    userId: string,
    cardNumber: string,
    expiry: string,
    cardholderName: string,
  ) {
    if (!this.luhn.validate(cardNumber)) {
      throw new BadRequestException('Invalid card number');
    }
    const cardHash = this.encryption.hashPan(cardNumber);
    const existing = await this.prisma.card.findFirst({
      where: { userId, cardHash, isActive: true },
    });
    if (existing) throw new ConflictException('Card already added');

    const lastFour = cardNumber.replace(/[\s-]/g, '').slice(-4);
    const encryptedPan = this.encryption.encrypt(cardNumber);
    const encryptedExpiry = this.encryption.encrypt(expiry);

    return this.prisma.card.create({
      data: { userId, lastFour, cardHash, encryptedPan, encryptedExpiry, cardholderName },
      select: { id: true, lastFour: true, cardholderName: true, createdAt: true },
    });
  }

  async listCards(userId: string) {
    return this.prisma.card.findMany({
      where: { userId, isActive: true },
      select: { id: true, lastFour: true, cardholderName: true, createdAt: true },
    });
  }

  async deleteCard(userId: string, cardId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card || !card.isActive) throw new NotFoundException('Card not found');
    if (card.userId !== userId) throw new ForbiddenException();
    await this.prisma.card.update({ where: { id: cardId }, data: { isActive: false } });
  }
}
