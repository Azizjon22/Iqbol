import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { ReportsController } from './reports.controller';

/** The PDFs themselves come from ReportsService, provided by TelegramModule. */
@Module({
  imports: [TelegramModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
