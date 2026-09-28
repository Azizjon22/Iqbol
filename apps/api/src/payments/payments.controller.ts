import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
@Controller()
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Get('payments/summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.payments.summary(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('payments/daily-report')
  dailyReport() {
    return this.payments.dailyReport();
  }

  @Get('events/:eventId/payments')
  findAllForEvent(@Param('eventId') eventId: string) {
    return this.payments.findAllForEvent(eventId);
  }

  @Post('events/:eventId/payments')
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.payments.create(eventId, dto, user.sub, user.fullName);
  }

  @Post('events/:eventId/refunds')
  refund(
    @Param('eventId') eventId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.payments.refund(eventId, dto, user.sub, user.fullName);
  }

  @Roles('SUPER_ADMIN')
  @Delete('payments/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.payments.remove(id, user.sub, user.fullName);
  }
}
