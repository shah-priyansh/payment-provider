import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { getCorrelationContext } from '../context/correlation.context';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const { correlationId } = getCorrelationContext();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? ((exception.getResponse() as any).message ?? exception.message)
        : 'Internal server error';

    this.logger.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'payment-provider',
        correlationId,
        errorDetails:
          exception instanceof Error ? exception.message : String(exception),
      }),
    );

    response.status(status).json({ statusCode: status, message, correlationId });
  }
}
