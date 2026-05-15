import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StateMachineService } from './state-machine.service';
import { RetryService } from './retry.service';
import { MockBankService } from '../mock-bank/mock-bank.service';
import { getCorrelationContext } from '../../common/context/correlation.context';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
    private readonly retry: RetryService,
    private readonly bank: MockBankService,
  ) {}

  async processPayment(transactionId: string): Promise<void> {
    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.stateMachine.transition(transactionId, tx.status, TransactionStatus.PROCESSING);
    await this.attemptPayment(transactionId);
  }

  private async attemptPayment(transactionId: string): Promise<void> {
    const { correlationId } = getCorrelationContext();

    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { cardToken: { include: { card: true } } },
    });
    if (!tx) throw new NotFoundException('Transaction not found');

    // TODO: pass full PAN once we have a proper decrypt-on-demand flow, for now lastFour is enough for the mock
    const result = await this.bank.authorize(
      tx.cardToken.card.lastFour,
      tx.amount.toString(),
      tx.currency,
    );

    if (result.success) {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { authCode: result.authCode },
      });
      await this.stateMachine.transition(transactionId, TransactionStatus.PROCESSING, TransactionStatus.AUTHORIZED, result.authCode);
      await this.stateMachine.transition(transactionId, TransactionStatus.AUTHORIZED, TransactionStatus.CAPTURED);

      this.logger.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'payment-provider',
        correlationId,
        transactionId,
        userId: tx.userId,
        eventType: 'PAYMENT_CAPTURED',
      }));
      return;
    }

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { errorCode: result.errorCode },
    });
    await this.stateMachine.transition(transactionId, TransactionStatus.PROCESSING, TransactionStatus.FAILED, result.errorCode);

    const shouldRetry = result.errorCode
      && this.retry.isRetryable(result.errorCode)
      && this.retry.canRetry(tx.retryCount);

    if (shouldRetry) {
      await this.stateMachine.transition(transactionId, TransactionStatus.FAILED, TransactionStatus.RETRYING);

      const delay = this.retry.calculateDelay(tx.retryCount);
      this.logger.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        service: 'payment-provider',
        correlationId,
        transactionId,
        eventType: 'PAYMENT_RETRY_SCHEDULED',
        attempt: tx.retryCount + 1,
        delay,
      }));

      await new Promise(r => setTimeout(r, delay));
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { retryCount: { increment: 1 } },
      });
      await this.stateMachine.transition(transactionId, TransactionStatus.RETRYING, TransactionStatus.PROCESSING);
      await this.attemptPayment(transactionId);
    } else {
      this.logger.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'payment-provider',
        correlationId,
        transactionId,
        userId: tx.userId,
        eventType: 'PAYMENT_FAILED_TERMINAL',
        errorCode: result.errorCode,
      }));
    }
  }

  async getTransaction(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }
}
