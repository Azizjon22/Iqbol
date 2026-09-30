import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { StaffUsersService } from './staff-users.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('staff-users')
export class StaffUsersController {
  constructor(private staffUsers: StaffUsersService) {}

  @Get()
  findAll() {
    return this.staffUsers.findAll();
  }

  @Post()
  create(@Body() dto: CreateStaffUserDto, @CurrentUser() user: AuthPayload) {
    return this.staffUsers.create(dto, user.sub, user.fullName);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffUserDto,
    @CurrentUser() user: AuthPayload,
  ) {
    if (id === user.sub && dto.isActive === false) {
      throw new ForbiddenException("O'zingizni faolsizlantira olmaysiz");
    }
    if (id === user.sub && dto.role && dto.role !== user.role) {
      throw new ForbiddenException("O'z rolingizni o'zgartira olmaysiz");
    }
    return this.staffUsers.update(id, dto, user.sub, user.fullName);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    if (id === user.sub) {
      throw new ForbiddenException("O'zingizni o'chira olmaysiz");
    }
    return this.staffUsers.remove(id, user.sub, user.fullName);
  }
}
