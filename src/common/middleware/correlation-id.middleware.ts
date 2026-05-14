import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correlationStorage } from '../context/correlation.context';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    res.setHeader('x-correlation-id', correlationId);
    correlationStorage.run({ correlationId }, next);
  }
}
