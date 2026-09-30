import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { FindEventsQuery } from './dto/find-events.query';
import { netPaid } from '../common/money/net-paid';

const eventInclude = {
  menu: true,
  assignments: {
    include: {
      worker: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          photoUrl: true,
          position: true,
          status: true,
        },
      },
      assignedBy: { select: { id: true, fullName: true } },
    },
  },
  payments: { orderBy: { paymentDate: 'desc' as const } },
  expenses: { orderBy: { createdAt: 'desc' as const } },
};

const eventDetailInclude = {
  ...eventInclude,
  shoppingLists: {
    include: {
      items: true,
      createdByWorker: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

const STATUS_LABEL_UZ: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  CONFIRMED: 'Tasdiqlangan',
  COMPLETED: 'Yakunlangan',
  CANCELLED: 'Bekor qilingan',
};

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(dto: CreateEventDto, actorId: string, actorName: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id: dto.menuId },
    });
    if (!menu) throw new BadRequestException('Menyu topilmadi');

    const totalPrice = menu.pricePerPerson.mul(dto.guestCount);

    const event = await this.prisma.event.create({
      data: {
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        eventDate: new Date(dto.eventDate),
        tableCapacity: dto.tableCapacity,
        guestCount: dto.guestCount,
        menuId: dto.menuId,
        totalPrice,
        notes: dto.notes,
        firstDish: dto.firstDish?.trim() || null,
        secondDish: dto.secondDish?.trim() || null,
        createdById: actorId,
      },
      include: eventDetailInclude,
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'EVENT',
      entityId: event.id,
      description: `"${event.clientName}" uchun yangi to'y yaratdi (${event.guestCount} mehmon)`,
    });

    return this.withBalance(event);
  }

  upcomingForPicker() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.prisma.event.findMany({
      where: { eventDate: { gte: startOfToday }, status: { not: 'CANCELLED' } },
      select: { id: true, clientName: true, eventDate: true },
      orderBy: { eventDate: 'asc' },
      // Also backs the chef's read-only events calendar, which needs every
      // upcoming booking in view, not just the nearest handful.
      take: 500,
    });
  }

  /**
   * What a chef needs to plan cooking: upcoming weddings with guests, tables
   * and the menu's dishes, plus their own shopping lists per wedding. No money.
   */
  chefAgenda(workerId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.prisma.event.findMany({
      where: { eventDate: { gte: startOfToday }, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        clientName: true,
        eventDate: true,
        status: true,
        guestCount: true,
        tableCapacity: true,
        menu: {
          select: {
            name: true,
            dishes: {
              select: { id: true, name: true, category: true },
              orderBy: { order: 'asc' },
            },
          },
        },
        assignments: { where: { workerId }, select: { id: true } },
        firstDish: true,
        secondDish: true,
        shoppingLists: {
          where: { createdByWorkerId: workerId },
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { eventDate: 'asc' },
      take: 200,
    });
  }

  async findAll(query: FindEventsQuery) {
    const where: Prisma.EventWhereInput = {
      status: query.status,
      eventDate: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };
    const events = await this.prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { eventDate: 'asc' },
    });
    return events.map((e) => this.withBalance(e));
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: eventDetailInclude,
    });
    if (!event) throw new NotFoundException("To'y buyurtmasi topilmadi");
    return this.withBalance(event);
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    actorId: string,
    actorName: string,
  ) {
    const existing = await this.ensureExists(id);
    let totalPrice = existing.totalPrice;

    // The per-guest price is fixed when the wedding is booked: later menu
    // price changes must not touch it. Only switching to a different menu
    // re-prices from that menu; a guest-count change reuses the agreed rate.
    const menuChanged = !!dto.menuId && dto.menuId !== existing.menuId;
    const guestCount = dto.guestCount ?? existing.guestCount;
    const guestsChanged = guestCount !== existing.guestCount;
    if (menuChanged || guestsChanged) {
      let perGuest = existing.totalPrice.div(existing.guestCount);
      if (menuChanged) {
        const menu = await this.prisma.menu.findUnique({
          where: { id: dto.menuId },
        });
        if (!menu) throw new BadRequestException('Menyu topilmadi');
        perGuest = menu.pricePerPerson;
      }
      totalPrice = perGuest.mul(guestCount).toDecimalPlaces(2);
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        tableCapacity: dto.tableCapacity,
        guestCount: dto.guestCount,
        menuId: dto.menuId,
        notes: dto.notes,
        // "" clears a choice; undefined leaves it untouched.
        firstDish:
          dto.firstDish === undefined
            ? undefined
            : dto.firstDish.trim() || null,
        secondDish:
          dto.secondDish === undefined
            ? undefined
            : dto.secondDish.trim() || null,
        totalPrice,
      },
      include: eventDetailInclude,
    });

    const changes: string[] = [];
    if (dto.guestCount && dto.guestCount !== existing.guestCount) {
      changes.push(`mehmonlar soni ${existing.guestCount} → ${dto.guestCount}`);
    }
    if (dto.eventDate) changes.push('sana');
    if (dto.menuId && dto.menuId !== existing.menuId) changes.push('menyu');
    if (
      dto.firstDish !== undefined &&
      (dto.firstDish.trim() || null) !== existing.firstDish
    ) {
      changes.push(`1-ovqat: ${dto.firstDish.trim() || '—'}`);
    }
    if (
      dto.secondDish !== undefined &&
      (dto.secondDish.trim() || null) !== existing.secondDish
    ) {
      changes.push(`2-ovqat: ${dto.secondDish.trim() || '—'}`);
    }
    if (dto.clientName && dto.clientName !== existing.clientName) {
      changes.push(`mijoz nomi "${existing.clientName}" → "${dto.clientName}"`);
    }

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'EVENT',
      entityId: event.id,
      description: `"${event.clientName}" to'yini tahrirladi${changes.length ? ` (${changes.join(', ')})` : ''}`,
    });

    return this.withBalance(event);
  }

  async updateStatus(
    id: string,
    status: string,
    actorId: string,
    actorName: string,
  ) {
    const existing = await this.ensureExists(id);
    const event = await this.prisma.event.update({
      where: { id },
      data: { status: status as never },
      include: eventDetailInclude,
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'STATUS_CHANGE',
      entityType: 'EVENT',
      entityId: event.id,
      description: `"${event.clientName}" to'y holatini ${STATUS_LABEL_UZ[existing.status] ?? existing.status} → ${STATUS_LABEL_UZ[status] ?? status} ga o'zgartirdi`,
    });

    return this.withBalance(event);
  }

  async remove(id: string, actorId: string, actorName: string) {
    const existing = await this.ensureExists(id);
    await this.prisma.event.delete({ where: { id } });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'EVENT',
      entityId: id,
      description: `"${existing.clientName}" to'yini butunlay o'chirdi`,
    });

    return { success: true };
  }

  async assignWorker(
    eventId: string,
    dto: AssignWorkerDto,
    actorId: string,
    actorName: string,
  ) {
    const existingEvent = await this.ensureExists(eventId);
    const worker = await this.prisma.worker.findUnique({
      where: { id: dto.workerId },
    });
    if (!worker) throw new BadRequestException('Ishchi topilmadi');
    if (worker.status !== 'APPROVED') {
      throw new BadRequestException('Ishchi hali tasdiqlanmagan');
    }

    const already = await this.prisma.eventWorkerAssignment.findUnique({
      where: { eventId_workerId: { eventId, workerId: dto.workerId } },
    });
    if (already)
      throw new ConflictException(
        "Bu ishchi allaqachon shu to'yga belgilangan",
      );

    await this.prisma.eventWorkerAssignment.create({
      data: {
        eventId,
        workerId: dto.workerId,
        assignedById: actorId,
        roleAtEvent: dto.roleAtEvent,
      },
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'ASSIGN',
      entityType: 'EVENT',
      entityId: eventId,
      description: `${worker.fullName}ni "${existingEvent.clientName}" to'yiga belgiladi`,
    });

    return this.findOne(eventId);
  }

  async unassignWorker(
    eventId: string,
    workerId: string,
    actorId: string,
    actorName: string,
  ) {
    const existingEvent = await this.ensureExists(eventId);
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });
    await this.prisma.eventWorkerAssignment.delete({
      where: { eventId_workerId: { eventId, workerId } },
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UNASSIGN',
      entityType: 'EVENT',
      entityId: eventId,
      description: `${worker?.fullName ?? 'Ishchi'}ni "${existingEvent.clientName}" to'yidan olib tashladi`,
    });

    return this.findOne(eventId);
  }

  private async ensureExists(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException("To'y buyurtmasi topilmadi");
    return event;
  }

  private withBalance<
    T extends {
      totalPrice: Prisma.Decimal;
      payments?: { amount: Prisma.Decimal; type: PaymentType }[];
      expenses?: { amount: Prisma.Decimal }[];
    },
  >(event: T) {
    const paid = netPaid(event.payments ?? []);
    const totalExpenses = (event.expenses ?? []).reduce(
      (sum, e) => sum.add(e.amount),
      new Prisma.Decimal(0),
    );
    const balance = event.totalPrice.sub(paid);
    const netProfit = paid.sub(totalExpenses);
    return { ...event, paidAmount: paid, balance, totalExpenses, netProfit };
  }
}
