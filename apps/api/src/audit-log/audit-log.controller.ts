import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditLogService } from './audit-log.service';

@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private auditLogs: AuditLogService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.auditLogs.findAll(limit ? Number(limit) : undefined);
  }
}
