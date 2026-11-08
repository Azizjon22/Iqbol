import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuditLogModule, UploadsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
