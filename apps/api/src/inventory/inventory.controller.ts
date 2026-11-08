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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChefGuard, StaffOrChefGuard } from '../common/guards/chef.guard';
import { SetLotPriceDto, TakeStockDto } from './dto/take-stock.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { StockCountDto } from './dto/stock-count.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  // Staff and chefs only — chefs browse this to build shopping lists from
  // photo cards with the right unit per item. Waiters have no use for it.
  @UseGuards(StaffOrChefGuard)
  @Get('catalog')
  catalog() {
    return this.inventory.productCatalog();
  }

  // ---- The chef's side of the store: see what there is (no prices), take
  // it for a wedding, undo it the same day.
  @UseGuards(ChefGuard)
  @Get('stock')
  stock() {
    return this.inventory.stockForChef();
  }

  @UseGuards(ChefGuard)
  @Get('usages/mine')
  myUsages(@CurrentUser() user: AuthPayload) {
    return this.inventory.myUsages(user.sub);
  }

  @UseGuards(ChefGuard)
  @Post('usages')
  take(@Body() dto: TakeStockDto, @CurrentUser() user: AuthPayload) {
    return this.inventory.takeForEvent(dto, user);
  }

  // Chef (own, same day) or super admin — checked in the service.
  @Delete('usages/:id')
  returnUsage(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.inventory.returnUsage(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('lots/:lotId')
  setLotPrice(
    @Param('lotId') lotId: string,
    @Body() dto: SetLotPriceDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.inventory.setLotPrice(
      lotId,
      dto.unitPrice,
      user.sub,
      user.fullName,
    );
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  findAll(@CurrentUser() user: AuthPayload) {
    return this.inventory.findAll(user.role);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('low-stock')
  lowStock() {
    return this.inventory.lowStock();
  }

  // Declared before ':id' so "transactions" isn't read as an item id.
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('transactions/recent')
  recent(@Query('limit') limit?: string) {
    return this.inventory.recentTransactions(limit ? Number(limit) : undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventory.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.inventory.create(dto, user.sub, user.fullName, user.role);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.inventory.update(id, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.inventory.remove(id, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/transactions')
  addTransaction(
    @Param('id') id: string,
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.inventory.addTransaction(
      id,
      dto,
      user.sub,
      user.fullName,
      user.role,
    );
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/count')
  count(
    @Param('id') id: string,
    @Body() dto: StockCountDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.inventory.count(id, dto, user.sub, user.fullName);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id/transactions')
  listTransactions(@Param('id') id: string) {
    return this.inventory.listTransactions(id);
  }
}
