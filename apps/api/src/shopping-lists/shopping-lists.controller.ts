import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShoppingListStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChefGuard } from '../common/guards/chef.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { ShoppingListsService } from './shopping-lists.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { MarkPurchasedDto, UpdateItemPriceDto } from './dto/mark-purchased.dto';

/**
 * The chef writes, confirms and buys a list on their own; the super admin
 * only watches it and can fix a mistyped price.
 */
@Controller('shopping-lists')
export class ShoppingListsController {
  constructor(private lists: ShoppingListsService) {}

  @UseGuards(ChefGuard)
  @Post()
  create(@Body() dto: CreateShoppingListDto, @CurrentUser() user: AuthPayload) {
    return this.lists.create(dto, user.sub);
  }

  @UseGuards(ChefGuard)
  @Delete(':id')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.lists.cancelByWorker(id, user.sub, user.fullName);
  }

  @UseGuards(ChefGuard)
  @Get('mine')
  findMine(@CurrentUser() user: AuthPayload) {
    return this.lists.findMineForWorker(user.sub);
  }

  @UseGuards(ChefGuard)
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.lists.confirm(id, user.sub, user.fullName);
  }

  @UseGuards(ChefGuard)
  @Patch(':id/items/:itemId/purchase')
  markPurchased(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: MarkPurchasedDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.lists.markItemPurchased(
      id,
      itemId,
      dto,
      user.sub,
      user.fullName,
    );
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll(@Query('status') status?: ShoppingListStatus) {
    return this.lists.findAll(status);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('pending')
  pending() {
    return this.lists.pending();
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('mark-all-seen')
  markAllSeen() {
    return this.lists.markAllSeen();
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('expense-report')
  expenseReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.lists.expenseReport(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    if (user.kind === 'WORKER') {
      if (user.position !== 'CHEF') {
        throw new ForbiddenException('Faqat oshpazlar uchun');
      }
      return this.lists.ensureWorkerOwnsOrThrow(id, user.sub);
    }
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException("Bu amal uchun ruxsatingiz yo'q");
    }
    return this.lists.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/items/:itemId/price')
  updateItemPrice(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemPriceDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.lists.updateItemPrice(id, itemId, dto, user.sub, user.fullName);
  }
}
