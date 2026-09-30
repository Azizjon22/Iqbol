import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { WorkersService } from './workers.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { FindWorkersQuery } from './dto/find-workers.query';

@Controller('workers')
export class WorkersController {
  constructor(private workers: WorkersService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterWorkerDto) {
    return this.workers.register(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Post()
  create(@Body() dto: RegisterWorkerDto, @CurrentUser() user: AuthPayload) {
    return this.workers.createByStaff(dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Get()
  findAll(@Query() query: FindWorkersQuery) {
    return this.workers.findAll(query);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workers.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.workers.approve(id, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.workers.reject(id, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.workers.update(id, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.workers.remove(id, user.sub, user.fullName);
  }
}
