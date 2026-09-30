import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateEventExpenseDto } from './dto/create-event-expense.dto';

const CATEGORY_LABEL_UZ: Record<string, string> = {
  SHOPPING: 'Bozorlik',
  CAMERAMAN: 'Kamerachi',
  ARTIST: "San'atkor",
  KORTEJ: 'Kortej',
  CHEF: 'Oshpazga to\'lov',
  WAITERS: 'Afitsantlarga to\'lov',
  ZAVZAL: 'Zavzalga to\'lov',
  CARWASH: 'Moyka',
  OTHER: 'Boshqa',
};

@Injectable()
export class EventExpensesService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(
    eventId: string,
    dto: CreateEventExpenseDto,
    actorId: string,
    actorName: string,
  ) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException("To'y buyurtmasi topilmadi");

    const expense = await this.prisma.eventExpense.create({
      data: {
        eventId,
        category: dto.category,
        amount: new Prisma.Decimal(dto.amount),
        note: dto.note,
        createdById: actorId,
      },
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      description: `"${event.clientName}" to'yiga ${CATEGORY_LABEL_UZ[dto.category] ?? dto.category} xarajatini qo'shdi (${dto.amount.toLocaleString('uz-UZ')} so'm)`,
    });

    return expense;
  }

  findAllForEvent(eventId: string) {
    return this.prisma.eventExpense.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async remove(id: string, actorId: string, actorName: string) {
    const expense = await this.prisma.eventExpense.findUnique({
      where: { id },
      include: { event: { select: { clientName: true } } },
    });
    if (!expense) throw new NotFoundException('Xarajat topilmadi');
    await this.prisma.eventExpense.delete({ where: { id } });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'EXPENSE',
      entityId: id,
      description: `"${expense.event.clientName}" to'yidan ${CATEGORY_LABEL_UZ[expense.category] ?? expense.category} xarajatini o'chirdi (${Number(expense.amount).toLocaleString('uz-UZ')} so'm)`,
    });

    return { success: true };
  }
}
