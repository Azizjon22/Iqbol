import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorAlertsService } from './error-alerts.service';

/** Nest's usual error responses, plus an alert for every 5xx. */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(
    adapterHost: HttpAdapterHost,
    private alerts: ErrorAlertsService,
  ) {
    super(adapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      const status =
        exception instanceof HttpException ? exception.getStatus() : 500;
      if (status >= 500) {
        const req = host
          .switchToHttp()
          .getRequest<Request & { user?: { sub?: string } }>();
        this.alerts.report(exception, {
          method: req.method,
          path: req.originalUrl?.split('?')[0] ?? req.url,
          status,
          userId: req.user?.sub,
          requestId: req.headers['x-request-id'] as string | undefined,
        });
      }
    }
    super.catch(exception, host);
  }
}
