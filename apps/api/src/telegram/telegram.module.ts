import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportsService } from '../reports/reports.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule],
  // ReportsService is stateless; the bot builds the PDFs it sends itself.
  providers: [TelegramService, ReportsService],
  exports: [TelegramService, ReportsService],
})
export class TelegramModule {}
