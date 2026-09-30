import { Module } from '@nestjs/common';
import { EventExpensesController } from './event-expenses.controller';
import { EventExpensesService } from './event-expenses.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [EventExpensesController],
  providers: [EventExpensesService],
})
export class EventExpensesModule {}
