import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { CreateMenuDishDto } from './dto/create-menu-dish.dto';
import { CreateMenuMediaDto } from './dto/create-menu-media.dto';
import { UpdateMenuDishDto } from './dto/update-menu-dish.dto';
import { UpdateMenuMediaDto } from './dto/update-menu-media.dto';
import { ReorderDto } from './dto/reorder.dto';

@Controller('menus')
export class MenusController {
  constructor(private menus: MenusService) {}

  @Public()
  @Get()
  findAll() {
    return this.menus.findAll();
  }

  // Declared before ':id' so "usage" isn't read as a menu id.
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('usage')
  usage() {
    return this.menus.usage();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menus.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreateMenuDto, @CurrentUser() user: AuthPayload) {
    return this.menus.create(dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.menus.update(id, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.menus.remove(id, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.menus.duplicate(id, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Put(':id/dishes/order')
  reorderDishes(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.menus.reorderDishes(id, dto.ids);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/dishes/:dishId')
  updateDish(
    @Param('id') id: string,
    @Param('dishId') dishId: string,
    @Body() dto: UpdateMenuDishDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.menus.updateDish(id, dishId, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/dishes')
  addDish(
    @Param('id') id: string,
    @Body() dto: CreateMenuDishDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.menus.addDish(id, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id/dishes/:dishId')
  removeDish(
    @Param('id') id: string,
    @Param('dishId') dishId: string,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.menus.removeDish(id, dishId, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Put(':id/media/order')
  reorderMedia(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.menus.reorderMedia(id, dto.ids);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/media/:mediaId')
  updateMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Body() dto: UpdateMenuMediaDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.menus.updateMedia(id, mediaId, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/media')
  addMedia(
    @Param('id') id: string,
    @Body() dto: CreateMenuMediaDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.menus.addMedia(id, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id/media/:mediaId')
  removeMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.menus.removeMedia(id, mediaId, user.sub, user.fullName);
  }
}
