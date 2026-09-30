import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { EventExpensesService } from './event-expenses.service';
import { CreateEventExpenseDto } from './dto/create-event-expense.dto';

@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
@Controller()
export class EventExpensesController {
  constructor(private expenses: EventExpensesService) {}

  @Get('events/:eventId/expenses')
  findAllForEvent(@Param('eventId') eventId: string) {
    return this.expenses.findAllForEvent(eventId);
  }

  @Post('events/:eventId/expenses')
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateEventExpenseDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.expenses.create(eventId, dto, user.sub, user.fullName);
  }

  @Roles('SUPER_ADMIN')
  @Delete('expenses/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.expenses.remove(id, user.sub, user.fullName);
  }
}
