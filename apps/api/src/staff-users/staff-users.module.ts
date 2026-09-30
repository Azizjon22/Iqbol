import { Module } from '@nestjs/common';
import { StaffUsersController } from './staff-users.controller';
import { StaffUsersService } from './staff-users.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [StaffUsersController],
  providers: [StaffUsersService],
})
export class StaffUsersModule {}
