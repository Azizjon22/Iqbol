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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { FindEventsQuery } from './dto/find-events.query';
import { ADMIN_VISIBLE_STATUSES } from '../shopping-lists/shopping-lists.service';
import { WorkerGuard } from '../common/guards/worker.guard';

// ADMIN still needs to see which shopping lists were written for a wedding
// (they manage procurement) — but only the ones SUPER_ADMIN has sent on —
// so only ZAVZAL loses that too. Everyone below SUPER_ADMIN loses the money
// fields themselves.
function hideFinancials(
  event: Record<string, unknown>,
  keepShoppingLists: boolean,
) {
  const {
    totalPrice: _totalPrice,
    paidAmount: _paidAmount,
    balance: _balance,
    payments: _payments,
    expenses: _expenses,
    totalExpenses: _totalExpenses,
    netProfit: _netProfit,
    shoppingLists,
    ...rest
  } = event;
  if (!keepShoppingLists) return rest;
  if (!Array.isArray(shoppingLists)) return { ...rest, shoppingLists };
  return {
    ...rest,
    shoppingLists: shoppingLists.filter((list: { status: string }) =>
      (ADMIN_VISIBLE_STATUSES as string[]).includes(list.status),
    ),
  };
}

/** The wedding's 1st/2nd dish is agreed with the couple — SUPER_ADMIN's call. */
function assertCanSetDishes(
  dto: { firstDish?: string; secondDish?: string },
  user: AuthPayload,
) {
  if (
    user.role !== 'SUPER_ADMIN' &&
    (dto.firstDish !== undefined || dto.secondDish !== undefined)
  ) {
    throw new ForbiddenException(
      '1-ovqat va 2-ovqatni faqat super admin belgilaydi',
    );
  }
}

@UseGuards(RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthPayload) {
    assertCanSetDishes(dto, user);
    const event = await this.events.create(dto, user.sub, user.fullName);
    if (user.role === 'SUPER_ADMIN') return event;
    return hideFinancials(event, true);
  }

  // No @Roles(): reachable by workers too, so chefs can pick which wedding
  // their shopping list is for. Returns no financial data.
  @Get('upcoming')
  upcoming() {
    return this.events.upcomingForPicker();
  }

  @UseGuards(WorkerGuard)
  @Get('chef-agenda')
  chefAgenda(@CurrentUser() user: AuthPayload) {
    return this.events.chefAgenda(user.sub);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Get()
  async findAll(
    @Query() query: FindEventsQuery,
    @CurrentUser() user: AuthPayload,
  ) {
    const events = await this.events.findAll(query);
    if (user.role === 'SUPER_ADMIN') return events;
    const keepShoppingLists = user.role === 'ADMIN';
    return events.map((e) => hideFinancials(e, keepShoppingLists));
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    const event = await this.events.findOne(id);
    if (user.role === 'SUPER_ADMIN') return event;
    return hideFinancials(event, user.role === 'ADMIN');
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: AuthPayload,
  ) {
    assertCanSetDishes(dto, user);
    const event = await this.events.update(id, dto, user.sub, user.fullName);
    return user.role === 'SUPER_ADMIN' ? event : hideFinancials(event, true);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    @CurrentUser() user: AuthPayload,
  ) {
    const event = await this.events.updateStatus(
      id,
      dto.status,
      user.sub,
      user.fullName,
    );
    return user.role === 'SUPER_ADMIN' ? event : hideFinancials(event, true);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.events.remove(id, user.sub, user.fullName);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Post(':id/assignments')
  async assignWorker(
    @Param('id') id: string,
    @Body() dto: AssignWorkerDto,
    @CurrentUser() user: AuthPayload,
  ) {
    const event = await this.events.assignWorker(
      id,
      dto,
      user.sub,
      user.fullName,
    );
    if (user.role === 'SUPER_ADMIN') return event;
    return hideFinancials(event, user.role === 'ADMIN');
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Delete(':id/assignments/:workerId')
  async unassignWorker(
    @Param('id') id: string,
    @Param('workerId') workerId: string,
    @CurrentUser() user: AuthPayload,
  ) {
    const event = await this.events.unassignWorker(
      id,
      workerId,
      user.sub,
      user.fullName,
    );
    if (user.role === 'SUPER_ADMIN') return event;
    return hideFinancials(event, user.role === 'ADMIN');
  }
}
