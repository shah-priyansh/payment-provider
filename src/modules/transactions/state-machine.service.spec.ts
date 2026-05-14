import { BadRequestException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { StateMachineService } from './state-machine.service';

const mockPrisma = {
  transaction: { update: jest.fn() },
  transactionStateHistory: { create: jest.fn() },
};

describe('StateMachineService', () => {
  let service: StateMachineService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new StateMachineService(mockPrisma as any);
  });

  const validTransitions: [TransactionStatus, TransactionStatus][] = [
    [TransactionStatus.INITIATED, TransactionStatus.PROCESSING],
    [TransactionStatus.PROCESSING, TransactionStatus.AUTHORIZED],
    [TransactionStatus.PROCESSING, TransactionStatus.FAILED],
    [TransactionStatus.AUTHORIZED, TransactionStatus.CAPTURED],
    [TransactionStatus.FAILED, TransactionStatus.RETRYING],
    [TransactionStatus.RETRYING, TransactionStatus.PROCESSING],
  ];

  it.each(validTransitions)('allows %s → %s', async (from, to) => {
    mockPrisma.transaction.update.mockResolvedValue({});
    mockPrisma.transactionStateHistory.create.mockResolvedValue({});
    await expect(service.transition('tx-1', from, to)).resolves.not.toThrow();
  });

  const invalidTransitions: [TransactionStatus, TransactionStatus][] = [
    [TransactionStatus.INITIATED, TransactionStatus.CAPTURED],
    [TransactionStatus.CAPTURED, TransactionStatus.PROCESSING],
    [TransactionStatus.FAILED, TransactionStatus.AUTHORIZED],
  ];

  it.each(invalidTransitions)('rejects %s → %s', async (from, to) => {
    await expect(service.transition('tx-1', from, to)).rejects.toThrow(BadRequestException);
  });

  it('writes history row on valid transition', async () => {
    mockPrisma.transaction.update.mockResolvedValue({});
    mockPrisma.transactionStateHistory.create.mockResolvedValue({});
    await service.transition('tx-1', TransactionStatus.INITIATED, TransactionStatus.PROCESSING, 'started');
    expect(mockPrisma.transactionStateHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transactionId: 'tx-1', reason: 'started' }),
    });
  });
});
