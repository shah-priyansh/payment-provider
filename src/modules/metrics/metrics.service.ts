import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const [total, captured, failed, last24h] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: TransactionStatus.CAPTURED } }),
      this.prisma.transaction.count({ where: { status: TransactionStatus.FAILED } }),
      this.prisma.transaction.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const avgResult = await this.prisma.$queryRaw<[{ avg_ms: number | null }]>`
      SELECT EXTRACT(EPOCH FROM AVG(updated_at - created_at)) * 1000 AS avg_ms
      FROM transactions
      WHERE status IN ('CAPTURED', 'FAILED')
    `;

    return {
      totalTransactions: total,
      last24hTransactions: last24h,
      successRate: (captured + failed) > 0 ? Number((captured / (captured + failed)).toFixed(4)) : 0,
      averageResponseTimeMs: Math.round(avgResult[0]?.avg_ms ?? 0),
    };
  }
}
