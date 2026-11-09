import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ClientErrorsController } from './client-errors.controller';
import { ErrorAlertsService } from './error-alerts.service';

@Global()
@Module({
  controllers: [ClientErrorsController],
  providers: [
    ErrorAlertsService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [ErrorAlertsService],
})
export class ErrorAlertsModule {}
