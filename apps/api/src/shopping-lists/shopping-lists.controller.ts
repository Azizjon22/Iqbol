import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
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
import { ShoppingTotalDto } from './dto/shopping-total.dto';
import { ReportsService } from '../reports/reports.service';
import { TelegramService } from '../telegram/telegram.service';

/**
 * The chef writes, confirms and buys a list on their own and records one
 * sum for it; the super admin only watches and can correct that sum.
 */
@Controller('shopping-lists')
export class ShoppingListsController {
  constructor(
    private lists: ShoppingListsService,
    private reports: ReportsService,
    private telegram: TelegramService,
  ) {}

  /** The chef who wrote it, or the super admin. */
  private async assertCanSee(id: string, user: AuthPayload) {
    if (user.kind === 'WORKER') {
      if (user.position !== 'CHEF') {
        throw new ForbiddenException('Faqat oshpazlar uchun');
      }
      await this.lists.ensureWorkerOwnsOrThrow(id, user.sub);
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException("Bu amal uchun ruxsatingiz yo'q");
    } else {
      await this.lists.findOne(id);
    }
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    await this.assertCanSee(id, user);
    const file = await this.reports.shoppingList(id);
    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  /** The list's PDF to the requester's own Telegram chat. */
  @Post(':id/pdf/telegram')
  async pdfToTelegram(
    @Param('id') id: string,
    @CurrentUser() user: AuthPayload,
  ) {
    await this.assertCanSee(id, user);
    if (!this.telegram.enabled) {
      throw new BadRequestException("Telegram bot o'chiq");
    }
    const sent = await this.telegram.sendFileToAccount(
      { kind: user.kind, id: user.sub },
      () => this.reports.shoppingList(id),
    );
    if (sent === 'NOT_LINKED') {
      throw new BadRequestException(
        'Telegram ulanmagan — botda /start bosib, telefon va parolingiz bilan ulaning',
      );
    }
    if (sent === 'FAILED') {
      throw new BadRequestException(
        "Telegramga yuborib bo'lmadi — birozdan keyin qayta urinib ko'ring",
      );
    }
    return { success: true };
  }

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

  /** Back from the bazaar: one sum for the whole list. */
  @UseGuards(ChefGuard)
  @Post(':id/finish')
  finish(
    @Param('id') id: string,
    @Body() dto: ShoppingTotalDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.lists.finish(id, dto, user.sub, user.fullName);
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
  @Patch(':id/total')
  setTotal(
    @Param('id') id: string,
    @Body() dto: ShoppingTotalDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.lists.setTotal(id, dto, user.sub, user.fullName);
  }
}
