import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { getCorrelationContext } from '../context/correlation.context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const { correlationId, userId } = getCorrelationContext();
        this.logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'payment-provider',
            correlationId,
            userId: userId ?? null,
            eventType: `${req.method} ${req.path}`,
            duration: Date.now() - start,
            errorDetails: null,
          }),
        );
      }),
    );
  }
}
