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
import { MarkPurchasedDto, UpdateItemPriceDto } from './dto/mark-purchased.dto';

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
 * The chef runs a list alone: writes it (SUBMITTED), confirms it and goes
 * to the bazaar (APPROVED), marks each item bought with what it cost; once
 * everything is bought it is PURCHASED and its total becomes the wedding's
 * shopping expense by itself. The super admin watches and can fix a price.
 */

/** Largest amount the totalCost column (Decimal 14,2) is trusted with. */
const MAX_TOTAL_COST = 99_999_999_999;

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

const UNIT_UZ: Record<string, string> = {
  KG: 'kg',
  LITER: 'litr',
  DONA: 'dona',
};

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
    if (!list?.eventId || list.status === 'SUBMITTED') return;
    if (list.items.some((i) => !i.isPurchased)) return;
    const amount = list.items.reduce(
      (sum, i) =>
        sum.add(i.totalCost ?? (i.unitPrice ? i.unitPrice.mul(i.quantity) : 0)),
      new Prisma.Decimal(0),
    );
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

  /** The chef marks an item bought at the bazaar, with what it cost. */
  async markItemPurchased(
    listId: string,
    itemId: string,
    dto: MarkPurchasedDto,
    workerId: string,
    workerName: string,
  ) {
    const list = await this.ensureWorkerOwnsOrThrow(listId, workerId);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Ro'yxat elementi topilmadi");
    if (item.isPurchased) {
      throw new BadRequestException(
        'Bu mahsulot allaqachon sotib olingan deb belgilangan',
      );
    }

    if (list.status !== 'APPROVED') {
      throw new BadRequestException(
        DRAFT_STATUSES.includes(list.status)
          ? "Avval ro'yxatni tasdiqlang, keyin xarid qiling"
          : "Bu ro'yxatning xaridi yakunlangan",
      );
    }

    const bought =
      dto.quantity !== undefined
        ? new Prisma.Decimal(dto.quantity)
        : item.quantity;
    const { unitPrice, totalCost } = this.resolvePrice(dto, bought);
    const quantityChanged = !bought.equals(item.quantity);

    // Wedding purchases stay on the shopping list. They are spent on that
    // event and must not change warehouse stock.
    let allBought = false;
    await this.prisma.$transaction(async (tx) => {
      await tx.shoppingListItem.update({
        where: { id: itemId },
        data: {
          isPurchased: true,
          unitPrice,
          totalCost,
          // Bought a different amount than listed: keep the planned figure
          // visible as "8 → 7 kg" (unless SUPER_ADMIN already set one).
          ...(quantityChanged
            ? {
                quantity: bought,
                originalQuantity: item.originalQuantity ?? item.quantity,
              }
            : {}),
        },
      });

      const remaining = await tx.shoppingListItem.count({
        where: { shoppingListId: listId, isPurchased: false },
      });
      if (remaining === 0) {
        allBought = true;
        await tx.shoppingList.update({
          where: { id: listId },
          data: { status: 'PURCHASED', adminSeenAt: null },
        });
        await this.syncExpense(tx, listId);
      }
    });

    await this.auditLog.record({
      actorId: null,
      actorName: workerName,
      action: 'UPDATE',
      entityType: 'SHOPPING_LIST',
      entityId: listId,
      description: `"${item.name}" (${bought} ${UNIT_UZ[item.unit]}) xarid qilinganini belgiladi, jami ${totalCost.toNumber().toLocaleString('uz-UZ')} so'm`,
    });
    if (allBought) void this.telegram.notifyListPurchased(listId);

    return this.findOne(listId);
  }

  /** Fix a mistyped price on an already-bought wedding item. */
  async updateItemPrice(
    listId: string,
    itemId: string,
    dto: UpdateItemPriceDto,
    actorId: string,
    actorName: string,
  ) {
    const list = await this.findOne(listId);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Ro'yxat elementi topilmadi");
    if (!item.isPurchased) {
      throw new BadRequestException(
        'Narxni faqat sotib olingan mahsulot uchun tuzatish mumkin',
      );
    }
    if (list.status === 'CLOSED') {
      throw new BadRequestException(
        "Ro'yxat tasdiqlab yopilgan — narxlarni endi o'zgartirib bo'lmaydi",
      );
    }
    const { unitPrice, totalCost } = this.resolvePrice(dto, item.quantity);
    await this.prisma.$transaction(async (tx) => {
      await tx.shoppingListItem.update({
        where: { id: itemId },
        data: { unitPrice, totalCost },
      });
      await this.syncExpense(tx, listId);
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'SHOPPING_LIST',
      entityId: listId,
      description: `"${item.name}" narxini tuzatdi: ${item.unitPrice ?? 0} → ${unitPrice} so'm (1 ${UNIT_UZ[item.unit]})`,
    });
    void this.telegram.notifyPriceFixed(listId);
    return this.findOne(listId);
  }

  /**
   * A typed total is kept exactly (the unit price is only for display);
   * a typed unit price gives total = price × quantity.
   */
  private resolvePrice(
    dto: { unitPrice?: number; totalPrice?: number },
    quantity: Prisma.Decimal,
  ) {
    if (dto.totalPrice !== undefined) {
      const totalCost = new Prisma.Decimal(dto.totalPrice).toDecimalPlaces(2);
      return {
        totalCost,
        unitPrice: totalCost.div(quantity).toDecimalPlaces(2),
      };
    }
    if (dto.unitPrice !== undefined) {
      const unitPrice = new Prisma.Decimal(dto.unitPrice).toDecimalPlaces(2);
      const totalCost = unitPrice.mul(quantity).toDecimalPlaces(2);
      if (totalCost.greaterThan(MAX_TOTAL_COST)) {
        throw new BadRequestException(
          'Jami summa juda katta — narxni tekshiring',
        );
      }
      return { unitPrice, totalCost };
    }
    throw new BadRequestException(
      'Narxni kiriting (jami summa yoki 1 birlik narxi)',
    );
  }

  async expenseReport(from?: Date, to?: Date) {
    const items = await this.prisma.shoppingListItem.findMany({
      where: {
        isPurchased: true,
        shoppingList: {
          createdAt: { gte: from, lte: to },
        },
      },
      include: {
        shoppingList: { select: { id: true, eventId: true, createdAt: true } },
      },
    });

    const total = items.reduce(
      (sum, item) =>
        sum.add(
          item.totalCost ??
            (item.unitPrice ? item.unitPrice.mul(item.quantity) : 0),
        ),
      new Prisma.Decimal(0),
    );

    return { total, items };
  }
}
