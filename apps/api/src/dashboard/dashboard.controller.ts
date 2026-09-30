import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { DashboardService } from './dashboard.service';

@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthPayload) {
    return this.dashboard.overview(user.role!);
  }
}
