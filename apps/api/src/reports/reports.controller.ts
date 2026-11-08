import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { TelegramService } from '../telegram/telegram.service';
import {
  REPORT_KINDS,
  REPORT_PERIODS,
  ReportsService,
  type ReportKind,
  type ReportPeriod,
} from './reports.service';

class ReportRequestDto {
  @IsIn(REPORT_KINDS)
  kind!: ReportKind;

  @IsIn(REPORT_PERIODS)
  period!: ReportPeriod;
}

/** Accounting and archive PDFs — the super admin's alone. */
@Controller('reports')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
export class ReportsController {
  constructor(
    private reports: ReportsService,
    private telegram: TelegramService,
  ) {}

  @Get('pdf')
  async download(@Query() query: ReportRequestDto) {
    const file = await this.reports.build(query.kind, query.period);
    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  /** Sends the PDF to the requester's linked Telegram chat (used by the mini app). */
  @Post('telegram')
  async toTelegram(
    @Body() dto: ReportRequestDto,
    @CurrentUser() user: AuthPayload,
  ) {
    if (!this.telegram.enabled) {
      throw new BadRequestException("Telegram bot o'chiq");
    }
    const sent = await this.telegram.sendReportToStaff(
      user.sub,
      dto.kind,
      dto.period,
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

  /** One wedding's expenses for the client — product prices left out. */
  @Get('event/:id/pdf')
  async eventPdf(@Param('id') id: string) {
    const file = await this.reports.eventForClient(id);
    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Post('event/:id/telegram')
  async eventToTelegram(
    @Param('id') id: string,
    @CurrentUser() user: AuthPayload,
  ) {
    if (!this.telegram.enabled) {
      throw new BadRequestException("Telegram bot o'chiq");
    }
    const sent = await this.telegram.sendEventReportToStaff(user.sub, id);
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

  /** The list the chef took to the bazaar, as it was sent to Telegram. */
  @Get('shopping-list/:id/pdf')
  async shoppingListPdf(@Param('id') id: string) {
    const file = await this.reports.shoppingList(id);
    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
