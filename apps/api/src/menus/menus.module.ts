import { Module } from '@nestjs/common';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [AuditLogModule, UploadsModule],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
