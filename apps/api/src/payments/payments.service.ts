import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { netPaid } from '../common/money/net-paid';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  /**
   * Row-locks the wedding for the rest of the transaction, then reads its
   * payments. Two money movements on one wedding therefore run one after
   * the other, and each checks the balance the other left behind — without
   * it, a double click could collect (or refund) the same money twice.
   */
  private async lockEvent(tx: Prisma.TransactionClient, eventId: string) {
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: { payments: { select: { id: true, amount: true, type: true } } },
    });
    if (!event) throw new NotFoundException("To'y buyurtmasi topilmadi");
    return event;
  }

  async create(
    eventId: string,
    dto: CreatePaymentDto,
    actorId: string,
    actorName: string,
  ) {
    const { payment, event } = await this.prisma.$transaction(async (tx) => {
      const event = await this.lockEvent(tx, eventId);
      if (event.status === 'CANCELLED') {
        throw new BadRequestException(
          "Bekor qilingan to'yga to'lov qabul qilinmaydi",
        );
      }

      // A payment may settle the balance but never push it below zero —
      // over-collection is almost always a typo or a duplicate entry.
      const amount = new Prisma.Decimal(dto.amount);
      const remaining = event.totalPrice.sub(netPaid(event.payments));
      if (amount.greaterThan(remaining)) {
        throw new BadRequestException(
          remaining.lessThanOrEqualTo(0)
            ? "Bu to'y to'liq to'langan — yangi to'lov qabul qilinmaydi"
            : `To'lov qolgan qarzdan oshib ketadi: qolgan qarz ${remaining.toNumber().toLocaleString('ru-RU')} so'm`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          eventId,
          amount,
          method: dto.method,
          note: dto.note,
          createdById: actorId,
        },
      });
      return { payment, event };
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'PAYMENT',
      entityId: payment.id,
      description: `"${event.clientName}" to'yiga ${dto.amount.toLocaleString('uz-UZ')} so'm to'lov qo'shdi`,
    });

    return payment;
  }

  /**
   * Money handed back to the client (e.g. deposit returned when the wedding
   * is called off). Recorded against the wedding, so its day nets out.
   */
  async refund(
    eventId: string,
    dto: CreatePaymentDto,
    actorId: string,
    actorName: string,
  ) {
    const { refund, event } = await this.prisma.$transaction(async (tx) => {
      const event = await this.lockEvent(tx, eventId);
      const amount = new Prisma.Decimal(dto.amount);
      const kept = netPaid(event.payments);
      if (amount.greaterThan(kept)) {
        throw new BadRequestException(
          kept.lessThanOrEqualTo(0)
            ? "Bu to'y uchun qaytariladigan pul yo'q"
            : `Olingan puldan ko'p qaytarib bo'lmaydi: qaytarish mumkin ${kept.toNumber().toLocaleString('ru-RU')} so'm`,
        );
      }
      const refund = await tx.payment.create({
        data: {
          eventId,
          type: 'REFUND',
          amount,
          method: dto.method,
          note: dto.note,
          createdById: actorId,
        },
      });
      return { refund, event };
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'PAYMENT',
      entityId: refund.id,
      description: `"${event.clientName}" mijoziga ${dto.amount.toLocaleString('uz-UZ')} so'm qaytarib berdi${dto.note ? ` (${dto.note})` : ''}`,
    });
    return refund;
  }

  findAllForEvent(eventId: string) {
    return this.prisma.payment.findMany({
      where: { eventId },
      orderBy: { paymentDate: 'desc' },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async remove(id: string, actorId: string, actorName: string) {
    const found = await this.prisma.payment.findUnique({
      where: { id },
      select: { eventId: true },
    });
    if (!found) throw new NotFoundException("To'lov topilmadi");

    const { payment, event } = await this.prisma.$transaction(async (tx) => {
      const event = await this.lockEvent(tx, found.eventId);
      const payment = await tx.payment.findUnique({ where: { id } });
      if (!payment) throw new NotFoundException("To'lov topilmadi");
      // Removing a payment must not leave more refunded than was ever paid.
      if (payment.type === 'PAYMENT') {
        const after = netPaid(event.payments.filter((p) => p.id !== id));
        if (after.isNegative()) {
          throw new BadRequestException(
            "Bu to'lovga qaytarish bog'langan — avval qaytarish yozuvini o'chiring",
          );
        }
      }
      await tx.payment.delete({ where: { id } });
      return { payment, event };
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'PAYMENT',
      entityId: id,
      description: `"${event.clientName}" to'yidan ${Number(payment.amount).toLocaleString('uz-UZ')} so'm ${payment.type === 'REFUND' ? 'qaytarish' : "to'lov"} yozuvini o'chirdi`,
    });

    return { success: true };
  }

  async summary(from?: Date, to?: Date) {
    // Cancelled weddings still count for money that actually moved (a kept
    // deposit, costs already paid) but not for expected revenue or debt.
    const events = await this.prisma.event.findMany({
      where: { eventDate: { gte: from, lte: to } },
      include: { payments: true, expenses: true },
    });
    const zero = new Prisma.Decimal(0);
    const paidOf = (e: (typeof events)[number]) => netPaid(e.payments);
    const spentOf = (e: (typeof events)[number]) =>
      e.expenses.reduce((s, x) => s.add(x.amount), zero);
    const live = events.filter((e) => e.status !== 'CANCELLED');

    const totalExpected = live.reduce((sum, e) => sum.add(e.totalPrice), zero);
    const liveCollected = live.reduce((sum, e) => sum.add(paidOf(e)), zero);
    const totalCollected = events.reduce((sum, e) => sum.add(paidOf(e)), zero);
    const totalExpenses = events.reduce((sum, e) => sum.add(spentOf(e)), zero);

    return {
      eventCount: live.length,
      totalExpected,
      totalCollected,
      totalOutstanding: totalExpected.sub(liveCollected),
      totalExpenses,
      totalNetProfit: totalCollected.sub(totalExpenses),
    };
  }

  /**
   * Facts-only accounting view: only events whose day has already arrived
   * (no projected revenue from weddings still in the future), grouped by
   * the day the wedding happened, plus a category breakdown of every
   * expense. Powers the accounting dashboard's "Sof foyda" / "Xarajatlar"
   * drill-downs and month/year rollups.
   *
   * "Arrived" is compared by calendar day, not exact instant — a wedding
   * scheduled for 18:00 today must count as soon as today starts, not only
   * once 18:00 has actually passed.
   */
  async dailyReport() {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const events = await this.prisma.event.findMany({
      // Cancelled weddings included: their kept deposit and paid costs are real money.
      where: { eventDate: { lte: endOfToday } },
      include: { payments: true, expenses: true },
      orderBy: { eventDate: 'asc' },
    });

    const dayMap = new Map<
      string,
      {
        paid: Prisma.Decimal;
        expenses: Prisma.Decimal;
        eventCount: number;
        categories: Map<string, Prisma.Decimal>;
      }
    >();
    const categoryMap = new Map<string, Prisma.Decimal>();

    for (const event of events) {
      const day = dayKey(event.eventDate);
      const paid = netPaid(event.payments);
      const expenses = event.expenses.reduce(
        (s, x) => s.add(x.amount),
        new Prisma.Decimal(0),
      );

      const entry = dayMap.get(day) ?? {
        paid: new Prisma.Decimal(0),
        expenses: new Prisma.Decimal(0),
        eventCount: 0,
        categories: new Map<string, Prisma.Decimal>(),
      };
      entry.paid = entry.paid.add(paid);
      entry.expenses = entry.expenses.add(expenses);
      if (event.status !== 'CANCELLED') entry.eventCount += 1;
      dayMap.set(day, entry);

      for (const x of event.expenses) {
        entry.categories.set(
          x.category,
          (entry.categories.get(x.category) ?? new Prisma.Decimal(0)).add(
            x.amount,
          ),
        );
        categoryMap.set(
          x.category,
          (categoryMap.get(x.category) ?? new Prisma.Decimal(0)).add(x.amount),
        );
      }
    }

    const days = Array.from(dayMap.entries())
      .map(([date, v]) => ({
        date,
        totalPaid: v.paid,
        totalExpenses: v.expenses,
        netProfit: v.paid.sub(v.expenses),
        eventCount: v.eventCount,
        expensesByCategory: Array.from(v.categories.entries())
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount.comparedTo(a.amount)),
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const totalPaid = days.reduce(
      (s, d) => s.add(d.totalPaid),
      new Prisma.Decimal(0),
    );
    const totalExpensesAll = days.reduce(
      (s, d) => s.add(d.totalExpenses),
      new Prisma.Decimal(0),
    );

    const expensesByCategory = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount.comparedTo(a.amount));

    return {
      days,
      totalPaid,
      totalExpenses: totalExpensesAll,
      netProfit: totalPaid.sub(totalExpensesAll),
      expensesByCategory,
    };
  }
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
