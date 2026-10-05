import { Injectable } from '@nestjs/common';
import { Prisma, StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { netPaid } from '../common/money/net-paid';

// Weddings happen in Tashkent (UTC+5, no DST). Day boundaries are computed
// in that zone explicitly so "tomorrow" stays right even when the server
// itself runs in UTC.
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

/** UTC instant of local midnight `dayOffset` days from today, Tashkent time. */
function localMidnight(now: Date, dayOffset = 0) {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  const midnightLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + dayOffset,
  );
  return new Date(midnightLocal - TZ_OFFSET_MS);
}

/** "YYYY-MM-DD" of an instant in Tashkent time. */
function localDateKey(date: Date) {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

const WEEK_DAYS = 7;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async overview(role: StaffRole) {
    const now = new Date();
    const today = localMidnight(now);
    const tomorrow = localMidnight(now, 1);
    const dayAfter = localMidnight(now, 2);
    const weekEnd = localMidnight(now, WEEK_DAYS);
    const local = new Date(now.getTime() + TZ_OFFSET_MS);
    const monthStart = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - TZ_OFFSET_MS,
    );
    const monthEnd = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) -
        TZ_OFFSET_MS,
    );
    const notCancelled = { status: { not: 'CANCELLED' as const } };

    const [activeCount, monthCount, weekEvents] = await Promise.all([
      // Same rule as the To'ylar page: not archived = dated today or later.
      this.prisma.event.count({
        where: { eventDate: { gte: today }, ...notCancelled },
      }),
      this.prisma.event.count({
        where: {
          eventDate: { gte: monthStart, lt: monthEnd },
          ...notCancelled,
        },
      }),
      this.prisma.event.findMany({
        where: { eventDate: { gte: today, lt: weekEnd }, ...notCancelled },
        include: {
          menu: { select: { name: true } },
          assignments: {
            include: {
              worker: {
                select: {
                  id: true,
                  fullName: true,
                  position: true,
                  photoUrl: true,
                },
              },
            },
          },
          payments: { select: { amount: true, type: true } },
          _count: { select: { shoppingLists: true } },
        },
        orderBy: { eventDate: 'asc' },
      }),
    ]);

    const showMoney = role === 'SUPER_ADMIN';
    const card = (e: (typeof weekEvents)[number]) => {
      const paid = netPaid(e.payments);
      return {
        id: e.id,
        clientName: e.clientName,
        clientPhone: e.clientPhone,
        eventDate: e.eventDate,
        status: e.status,
        guestCount: e.guestCount,
        tableCapacity: e.tableCapacity,
        menuName: e.menu.name,
        firstDish: e.firstDish,
        secondDish: e.secondDish,
        assignedWorkers: e.assignments.map((a) => a.worker),
        shoppingListCount: e._count.shoppingLists,
        ...(showMoney ? { balance: e.totalPrice.sub(paid) } : {}),
      };
    };

    const inDay = (e: { eventDate: Date }, from: Date, to: Date) =>
      e.eventDate >= from && e.eventDate < to;
    const week = Array.from({ length: WEEK_DAYS }, (_, i) => {
      const from = localMidnight(now, i);
      const to = localMidnight(now, i + 1);
      return {
        date: localDateKey(from),
        events: weekEvents
          .filter((e) => inDay(e, from, to))
          .map((e) => ({
            id: e.id,
            clientName: e.clientName,
            eventDate: e.eventDate,
            guestCount: e.guestCount,
            status: e.status,
          })),
      };
    });

    const base = {
      todayDate: localDateKey(today),
      counts: {
        active: activeCount,
        thisMonth: monthCount,
        week: weekEvents.length,
        weekGuests: weekEvents.reduce((s, e) => s + e.guestCount, 0),
        today: weekEvents.filter((e) => inDay(e, today, tomorrow)).length,
        tomorrow: weekEvents.filter((e) => inDay(e, tomorrow, dayAfter)).length,
      },
      todayEvents: weekEvents
        .filter((e) => inDay(e, today, tomorrow))
        .map(card),
      tomorrowEvents: weekEvents
        .filter((e) => inDay(e, tomorrow, dayAfter))
        .map(card),
      week,
    };

    if (role === 'ZAVZAL') {
      return base;
    }

    const [lowStockItems, pendingShoppingLists] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { minThreshold: { not: null } },
      }),
      // SUPER_ADMIN is alerted to fresh chef lists; ADMIN only to lists
      // SUPER_ADMIN has approved and sent on to them.
      this.prisma.shoppingList.count({
        where:
          role === 'ADMIN'
            ? { status: 'APPROVED', adminSeenAt: null }
            : { status: 'SUBMITTED' },
      }),
    ]);

    const lowStock = lowStockItems.filter(
      (item) =>
        item.minThreshold && item.quantity.lessThanOrEqualTo(item.minThreshold),
    );

    const withOperational = {
      ...base,
      lowStockItems: lowStock,
      pendingShoppingLists,
    };

    // Profit/revenue figures are super_admin-only — admin still gets the
    // operational widgets above (low stock, pending shopping lists).
    if (role !== 'SUPER_ADMIN') {
      return withOperational;
    }

    // Cancelled weddings still count for money that actually moved (a kept
    // deposit, costs already paid) but not for expected revenue or debt.
    const monthEvents = await this.prisma.event.findMany({
      where: { eventDate: { gte: monthStart, lt: monthEnd } },
      include: { payments: true, expenses: true },
    });
    const zero = new Prisma.Decimal(0);
    const paidOf = (e: (typeof monthEvents)[number]) => netPaid(e.payments);
    const spentOf = (e: (typeof monthEvents)[number]) =>
      e.expenses.reduce((s, x) => s.add(x.amount), zero);
    const live = monthEvents.filter((e) => e.status !== 'CANCELLED');

    const totalExpected = live.reduce((sum, e) => sum.add(e.totalPrice), zero);
    const liveCollected = live.reduce((sum, e) => sum.add(paidOf(e)), zero);
    const totalCollected = monthEvents.reduce(
      (sum, e) => sum.add(paidOf(e)),
      zero,
    );
    const totalExpenses = monthEvents.reduce(
      (sum, e) => sum.add(spentOf(e)),
      zero,
    );

    return {
      ...withOperational,
      monthlyFinancials: {
        eventCount: live.length,
        totalExpected,
        totalCollected,
        totalOutstanding: totalExpected.sub(liveCollected),
        totalExpenses,
        netProfit: totalCollected.sub(totalExpenses),
      },
    };
  }
}
