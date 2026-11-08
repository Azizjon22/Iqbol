import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShoppingListStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { ShoppingTotalDto } from './dto/shopping-total.dto';

const include = {
  items: true,
  createdByWorker: { select: { id: true, fullName: true, position: true } },
  event: {
    select: { id: true, clientName: true, clientNameRu: true, eventDate: true, guestCount: true },
  },
  reviewedBy: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
};

/**
 * The chef runs a list alone: writes it (SUBMITTED), confirms it (APPROVED —
 * the list arrives in Telegram as a PDF to take to the bazaar), and when
 * done types what the whole bazaar cost as one sum (PURCHASED). That sum
 * becomes the wedding's shopping expense by itself. The super admin
 * watches and can correct the sum.
 */

/**
 * Once a wedding's shopping is bought (and later priced and closed), the
 * bazaar is over for that date: chefs cannot add another list to it.
 */
export const SHOPPING_DONE_STATUSES: ShoppingListStatus[] = [
  'PURCHASED',
  'CLOSED',
];

/** Written but not yet confirmed by the chef: still theirs to cancel. */
const DRAFT_STATUSES: ShoppingListStatus[] = ['SUBMITTED', 'REVIEWED'];

/**
 * The buyer wants one line per product: tomatoes for the salad and for the
 * first dish arrive as one total. Same name (any case) and unit add up.
 */
export function mergeSameProduct<
  T extends {
    name: string;
    nameRu?: string;
    quantity: number;
    unit: string;
    note?: string;
    noteRu?: string;
  },
>(items: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of items) {
    const k = `${item.name.trim().toLowerCase()}|${item.unit}`;
    const prev = merged.get(k);
    merged.set(
      k,
      prev
        ? {
            ...prev,
            quantity: +(prev.quantity + item.quantity).toFixed(3),
            note:
              [prev.note, item.note].filter(Boolean).join('; ') || undefined,
            noteRu:
              [prev.noteRu, item.noteRu].filter(Boolean).join('; ') ||
              undefined,
          }
        : { ...item, name: item.name.trim(), nameRu: item.nameRu?.trim() },
    );
  }
  return [...merged.values()];
}

@Injectable()
export class ShoppingListsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private telegram: TelegramService,
  ) {}

  async create(dto: CreateShoppingListDto, workerId: string) {
    if (dto.eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: dto.eventId },
        select: { status: true },
      });
      if (!event) throw new BadRequestException("To'y topilmadi");
      if (event.status === 'CANCELLED') {
        throw new BadRequestException(
          "Bekor qilingan to'y uchun bozorlik yozilmaydi",
        );
      }
      const done = await this.prisma.shoppingList.count({
        where: {
          eventId: dto.eventId,
          status: { in: SHOPPING_DONE_STATUSES },
        },
      });
      if (done > 0) {
        throw new BadRequestException(
          "Bu to'yning bozorligi yakunlangan — yangi ro'yxat yozib bo'lmaydi",
        );
      }
    }
    const list = await this.prisma.shoppingList.create({
      data: {
        eventId: dto.eventId,
        createdByWorkerId: workerId,
        items: {
          create: mergeSameProduct(dto.items).map((item) => ({
            name: item.name,
            nameRu: item.nameRu,
            quantity: item.quantity,
            unit: item.unit,
            note: item.note,
            noteRu: item.noteRu,
          })),
        },
      },
      include,
    });
    return list;
  }

  findAll(status?: ShoppingListStatus) {
    return this.prisma.shoppingList.findMany({
      where: { status },
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  findMineForWorker(workerId: string) {
    return this.prisma.shoppingList.findMany({
      where: { createdByWorkerId: workerId },
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { id },
      include,
    });
    if (!list) throw new NotFoundException("Bozorlik ro'yxati topilmadi");
    return list;
  }

  /** A chef takes back a list sent by mistake — only before anyone acted on it. */
  async cancelByWorker(id: string, workerId: string, workerName: string) {
    const list = await this.ensureWorkerOwnsOrThrow(id, workerId);
    if (
      !DRAFT_STATUSES.includes(list.status) ||
      list.items.some((i) => i.isPurchased)
    ) {
      throw new BadRequestException(
        "Ro'yxat tasdiqlangan — endi uni bekor qilib bo'lmaydi",
      );
    }
    await this.prisma.shoppingList.delete({ where: { id } });
    await this.auditLog.record({
      actorId: null,
      actorName: workerName,
      action: 'DELETE',
      entityType: 'SHOPPING_LIST',
      entityId: id,
      description: `Oshpaz o'z bozorlik ro'yxatini bekor qildi${list.event ? ` (${list.event.clientName})` : ''}`,
    });
    return { success: true };
  }

  async ensureWorkerOwnsOrThrow(id: string, workerId: string) {
    const list = await this.findOne(id);
    if (list.createdByWorkerId !== workerId) {
      throw new ForbiddenException("Bu ro'yxat sizga tegishli emas");
    }
    return list;
  }

  /** The chef is done writing and goes to the bazaar; the list is locked. */
  async confirm(id: string, workerId: string, workerName: string) {
    const list = await this.ensureWorkerOwnsOrThrow(id, workerId);
    if (!DRAFT_STATUSES.includes(list.status)) {
      throw new BadRequestException("Bu ro'yxat allaqachon tasdiqlangan");
    }
    if (list.items.length === 0) {
      throw new BadRequestException("Bo'sh ro'yxatni tasdiqlab bo'lmaydi");
    }
    await this.prisma.shoppingList.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    await this.auditLog.record({
      actorId: null,
      actorName: workerName,
      action: 'STATUS_CHANGE',
      entityType: 'SHOPPING_LIST',
      entityId: id,
      description: `Oshpaz bozorlik ro'yxatini tasdiqlab, xaridga chiqdi${list.event ? ` (${list.event.clientName})` : ''}`,
    });
    void this.telegram.notifyListSubmitted(id);
    return this.findOne(id);
  }

  /**
   * What the super admin's bell shows, cheap enough to ask every few
   * seconds: lists a chef has confirmed or finished since they last looked.
   */
  async pending() {
    const where: Prisma.ShoppingListWhereInput = {
      status: { in: ['APPROVED', 'PURCHASED'] },
      adminSeenAt: null,
    };
    const [count, latest] = await Promise.all([
      this.prisma.shoppingList.count({ where }),
      this.prisma.shoppingList.findFirst({
        where,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          createdByWorker: { select: { fullName: true } },
          event: { select: { clientName: true, clientNameRu: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    return {
      count,
      latest: latest && {
        id: latest.id,
        workerName: latest.createdByWorker.fullName,
        clientName: latest.event?.clientName ?? null,
        clientNameRu: latest.event?.clientNameRu ?? null,
        itemCount: latest._count.items,
      },
    };
  }

  /** Opening the shopping lists page clears the bell. */
  async markAllSeen() {
    await this.prisma.shoppingList.updateMany({
      where: { status: { in: ['APPROVED', 'PURCHASED'] }, adminSeenAt: null },
      data: { adminSeenAt: new Date() },
    });
  }

  /**
   * A finished list's total is the wedding's shopping expense — added by
   * itself, and kept in step when the super admin fixes a price.
   */
  private async syncExpense(tx: Prisma.TransactionClient, listId: string) {
    const list = await tx.shoppingList.findUnique({
      where: { id: listId },
      include: { items: true, createdByWorker: { select: { fullName: true } } },
    });
    if (!list?.eventId || list.totalCost === null) return;
    const amount = list.totalCost;
    await tx.eventExpense.upsert({
      where: { shoppingListId: listId },
      create: {
        eventId: list.eventId,
        category: 'SHOPPING',
        amount,
        note: `Bozorlik — ${list.createdByWorker.fullName}`,
        noteRu: `Закупка — ${list.createdByWorker.fullName}`,
        shoppingListId: listId,
      },
      update: { amount },
    });
  }

  /** Back from the bazaar: the chef types what everything cost, as one sum. */
  async finish(
    id: string,
    dto: ShoppingTotalDto,
    workerId: string,
    workerName: string,
  ) {
    const list = await this.ensureWorkerOwnsOrThrow(id, workerId);
    if (list.status !== 'APPROVED') {
      throw new BadRequestException(
        DRAFT_STATUSES.includes(list.status)
          ? "Avval ro'yxatni tasdiqlang, keyin xaridni yakunlang"
          : "Bu ro'yxatning xaridi allaqachon yakunlangan",
      );
    }
    const total = new Prisma.Decimal(dto.total).toDecimalPlaces(2);
    await this.prisma.$transaction(async (tx) => {
      await tx.shoppingListItem.updateMany({
        where: { shoppingListId: id },
        data: { isPurchased: true },
      });
      await tx.shoppingList.update({
        where: { id },
        data: { status: 'PURCHASED', totalCost: total, adminSeenAt: null },
      });
      await this.syncExpense(tx, id);
    });
    await this.auditLog.record({
      actorId: null,
      actorName: workerName,
      action: 'UPDATE',
      entityType: 'SHOPPING_LIST',
      entityId: id,
      description: `Bozorlikni yakunladi${list.event ? ` (${list.event.clientName})` : ''}: jami ${total.toNumber().toLocaleString('uz-UZ')} so'm`,
    });
    void this.telegram.notifyListPurchased(id);
    return this.findOne(id);
  }

  /** The super admin corrects a mistyped bazaar sum; the expense follows. */
  async setTotal(
    id: string,
    dto: ShoppingTotalDto,
    actorId: string,
    actorName: string,
  ) {
    const list = await this.findOne(id);
    if (list.status !== 'PURCHASED' && list.status !== 'CLOSED') {
      throw new BadRequestException(
        "Summani faqat xaridi yakunlangan ro'yxatda tuzatish mumkin",
      );
    }
    const total = new Prisma.Decimal(dto.total).toDecimalPlaces(2);
    await this.prisma.$transaction(async (tx) => {
      await tx.shoppingList.update({
        where: { id },
        data: { totalCost: total },
      });
      await this.syncExpense(tx, id);
    });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'SHOPPING_LIST',
      entityId: id,
      description: `Bozorlik summasini tuzatdi: ${Number(list.totalCost ?? 0).toLocaleString('uz-UZ')} → ${total.toNumber().toLocaleString('uz-UZ')} so'm`,
    });
    void this.telegram.notifyPriceFixed(id);
    return this.findOne(id);
  }

  async expenseReport(from?: Date, to?: Date) {
    const lists = await this.prisma.shoppingList.findMany({
      where: {
        totalCost: { not: null },
        createdAt: { gte: from, lte: to },
      },
      select: { id: true, eventId: true, createdAt: true, totalCost: true },
    });
    const total = lists.reduce(
      (sum, l) => sum.add(l.totalCost ?? 0),
      new Prisma.Decimal(0),
    );
    return { total, lists };
  }
}
