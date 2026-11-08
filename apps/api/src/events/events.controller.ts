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
import { ChefGuard, StaffOrChefGuard } from '../common/guards/chef.guard';

// Everyone below SUPER_ADMIN loses the money fields, and the shopping
// lists too: those are the chef's and the super admin's alone now.
function hideFinancials(event: Record<string, unknown>) {
  const {
    totalPrice: _totalPrice,
    paidAmount: _paidAmount,
    balance: _balance,
    payments: _payments,
    expenses: _expenses,
    totalExpenses: _totalExpenses,
    netProfit: _netProfit,
    // Carries costs; the store's prices are the super admin's alone.
    stockUsages: _stockUsages,
    shoppingLists: _shoppingLists,
    ...rest
  } = event;
  return rest;
}

/** The wedding's 1st/2nd dish is agreed with the couple — SUPER_ADMIN's call. */
function assertCanSetDishes(
  dto: { firstDish?: string; secondDish?: string; firstDishRu?: string; secondDishRu?: string },
  user: AuthPayload,
) {
  if (
    user.role !== 'SUPER_ADMIN' &&
    (dto.firstDish !== undefined ||
      dto.secondDish !== undefined ||
      dto.firstDishRu !== undefined ||
      dto.secondDishRu !== undefined)
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
    return hideFinancials(event);
  }

  // No @Roles(): reachable by workers too, so chefs can pick which wedding
  // their shopping list is for. Returns no financial data.
  @UseGuards(StaffOrChefGuard)
  @Get('upcoming')
  upcoming() {
    return this.events.upcomingForPicker();
  }

  @UseGuards(ChefGuard)
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
    return events.map((e) => hideFinancials(e));
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'ZAVZAL')
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    const event = await this.events.findOne(id);
    if (user.role === 'SUPER_ADMIN') return event;
    return hideFinancials(event);
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
    return user.role === 'SUPER_ADMIN' ? event : hideFinancials(event);
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
    return user.role === 'SUPER_ADMIN' ? event : hideFinancials(event);
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
    return hideFinancials(event);
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
    return hideFinancials(event);
  }
}
