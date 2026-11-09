import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ReportsService } from '../reports/reports.service';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [TelegramController],
  // ReportsService is stateless; the bot builds the PDFs it sends itself.
  providers: [TelegramService, ReportsService],
  exports: [TelegramService, ReportsService],
})
export class TelegramModule {}
