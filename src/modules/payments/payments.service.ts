import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CardTokenService } from '../cards/card-token.service';
import { Transaction, TransactionStatus } from '@prisma/client';
import { getCorrelationContext } from '../../common/context/correlation.context';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
    private readonly cardTokens: CardTokenService,
  ) {}

  async initiatePayment(
    userId: string,
    cardToken: string,
    amount: number,
    currency: string,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('idempotency-key header is required');
    }

    const { correlationId } = getCorrelationContext();

    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
    if (existing) {
      this.logger.log(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'info', service: 'payment-provider',
        correlationId, userId, transactionId: existing.id, eventType: 'IDEMPOTENCY_HIT',
      }));
      return existing;
    }

    const validToken = await this.cardTokens.validateToken(cardToken, userId);

    let tx: Transaction;
    try {
      tx = await this.prisma.transaction.create({
        data: {
          userId,
          cardTokenId: validToken.id,
          amount,
          currency: currency.toUpperCase(),
          status: TransactionStatus.INITIATED,
          idempotencyKey,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Race condition: another request created this transaction concurrently
        const raced = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
        if (raced) return raced;
      }
      throw err;
    }

    this.logger.log(JSON.stringify({
      timestamp: new Date().toISOString(), level: 'info', service: 'payment-provider',
      correlationId, userId, transactionId: tx.id, eventType: 'PAYMENT_INITIATED', amount, currency,
    }));

    this.transactions.processPayment(tx.id).catch((err: Error) =>
      this.logger.error(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'error', service: 'payment-provider',
        correlationId, transactionId: tx.id, eventType: 'PAYMENT_PROCESS_ERROR',
        errorDetails: err.message,
      })),
    );

    return tx;
  }

  async getPayment(id: string, userId: string) {
    const tx = await this.transactions.getTransaction(id);
    if (tx.userId !== userId) throw new ForbiddenException();
    return tx;
  }
}
