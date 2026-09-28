import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { SettingsService } from './settings.service';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  // Public: the login screen and client presentation show the brand too.
  @Public()
  @Get('brand')
  getBrand() {
    return this.settings.getBrand();
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('brand')
  updateBrand(@Body() dto: UpdateBrandDto, @CurrentUser() user: AuthPayload) {
    return this.settings.updateBrand(dto, user.sub, user.fullName);
  }
}
