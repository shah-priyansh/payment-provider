import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  getMetrics() {
    return this.metrics.getMetrics();
  }
}
