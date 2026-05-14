import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const VALID_TRANSITIONS: Partial<Record<TransactionStatus, TransactionStatus[]>> = {
  [TransactionStatus.INITIATED]:  [TransactionStatus.PROCESSING],
  [TransactionStatus.PROCESSING]: [TransactionStatus.AUTHORIZED, TransactionStatus.FAILED],
  [TransactionStatus.AUTHORIZED]: [TransactionStatus.CAPTURED],
  [TransactionStatus.FAILED]:     [TransactionStatus.RETRYING],
  [TransactionStatus.RETRYING]:   [TransactionStatus.PROCESSING],
};

@Injectable()
export class StateMachineService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(
    transactionId: string,
    from: TransactionStatus,
    to: TransactionStatus,
    reason?: string,
  ): Promise<void> {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Invalid state transition: ${from} → ${to}`);
    }
    await Promise.all([
      this.prisma.transaction.update({ where: { id: transactionId }, data: { status: to } }),
      this.prisma.transactionStateHistory.create({
        data: { transactionId, fromStatus: from, toStatus: to, reason },
      }),
    ]);
  }
}
