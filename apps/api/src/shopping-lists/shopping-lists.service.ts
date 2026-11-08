import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShoppingListStatus, StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { MarkPurchasedDto, UpdateItemPriceDto } from './dto/mark-purchased.dto';
import { UpdateShoppingListItemsDto } from './dto/update-items.dto';

const include = {
  items: true,
  createdByWorker: { select: { id: true, fullName: true, position: true } },
  event: {
    select: { id: true, clientName: true, eventDate: true, guestCount: true },
  },
  reviewedBy: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
};

/**
 * A chef's list goes to SUPER_ADMIN first; ADMIN only ever sees it once
 * SUPER_ADMIN has checked (and possibly corrected) it and sent it on.
 */
export const ADMIN_VISIBLE_STATUSES: ShoppingListStatus[] = [
  'APPROVED',
  'PURCHASED',
  'CLOSED',
];

const NOT_YET_SENT_STATUSES: ShoppingListStatus[] = ['SUBMITTED', 'REVIEWED'];

function visibleTo(role?: StaffRole): Prisma.ShoppingListWhereInput {
  return role === 'ADMIN' ? { status: { in: ADMIN_VISIBLE_STATUSES } } : {};
}

const UNIT_UZ: Record<string, string> = {
  KG: 'kg',
  LITER: 'litr',
  DONA: 'dona',
};

const STATUS_LABEL_UZ: Record<string, string> = {
  SUBMITTED: 'Yuborilgan',
  REVIEWED: "Ko'rib chiqilgan",
  APPROVED: 'Adminga yuborilgan',
  PURCHASED: 'Xarid qilingan',
  CLOSED: 'Yopilgan',
};

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
        select: { id: true },
      });
      if (!event) throw new BadRequestException("To'y topilmadi");
    }
    const list = await this.prisma.shoppingList.create({
      data: {
        eventId: dto.eventId,
        createdByWorkerId: workerId,
        items: {
          create: dto.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            note: item.note,
          })),
        },
      },
      include,
    });
    // Tell the super admins on Telegram; not awaited so the chef isn't kept waiting.
    void this.telegram.notifyListSubmitted(list.id);
    return list;
  }

  findAll(role?: StaffRole, status?: ShoppingListStatus) {
    return this.prisma.shoppingList.findMany({
      where: { AND: [visibleTo(role), { status }] },
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

  async findOne(id: string, role?: StaffRole) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { id, ...visibleTo(role) },
      include,
    });
    if (!list) throw new NotFoundException("Bozorlik ro'yxati topilmadi");
    return list;
  }

  /** A chef takes back a list sent by mistake — only before anyone acted on it. */
  async cancelByWorker(id: string, workerId: string, workerName: string) {
    const list = await this.ensureWorkerOwnsOrThrow(id, workerId);
    if (
      !NOT_YET_SENT_STATUSES.includes(list.status) ||
      list.items.some((i) => i.isPurchased)
    ) {
      throw new BadRequestException(
        "Ro'yxat allaqachon adminga yuborilgan — endi uni bekor qilib bo'lmaydi",
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

  async updateStatus(
    id: string,
    status: ShoppingListStatus,
    actorId: string,
    actorName: string,
    role?: StaffRole,
  ) {
    if (status === 'APPROVED') {
      throw new BadRequestException(
        'Adminga yuborish uchun "Adminga yuborish" amalidan foydalaning',
      );
    }
    if (role === 'ADMIN' && !ADMIN_VISIBLE_STATUSES.includes(status)) {
      throw new ForbiddenException("Bu amal uchun ruxsatingiz yo'q");
    }
    const existing = await this.findOne(id, role);
    const list = await this.prisma.shoppingList.update({
      where: { id },
      data: { status, reviewedById: actorId, reviewedAt: new Date() },
      include,
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'STATUS_CHANGE',
      entityType: 'SHOPPING_LIST',
      entityId: id,
      description: `${existing.createdByWorker.fullName}ning bozorlik ro'yxati holatini ${STATUS_LABEL_UZ[existing.status] ?? existing.status} → ${STATUS_LABEL_UZ[status] ?? status} ga o'zgartirdi`,
    });

    return list;
  }

  /**
   * SUPER_ADMIN corrects the chef's list before it reaches ADMIN — changes
   * quantities, drops items, adds missing ones. Purchased items are locked.
   */
  async updateItems(
    id: string,
    dto: UpdateShoppingListItemsDto,
    actorId: string,
    actorName: string,
  ) {
    const list = await this.findOne(id);
    if (list.status === 'PURCHASED' || list.status === 'CLOSED') {
      throw new BadRequestException(
        "Xarid qilingan yoki yopilgan ro'yxatni o'zgartirib bo'lmaydi",
      );
    }

    const editable = new Map(
      list.items.filter((i) => !i.isPurchased).map((i) => [i.id, i]),
    );
    for (const input of dto.items) {
      if (input.id && !editable.has(input.id)) {
        throw new BadRequestException(
          "Ro'yxat elementi topilmadi yoki allaqachon xarid qilingan",
        );
      }
    }

    const keptIds = new Set(dto.items.map((i) => i.id).filter(Boolean));
    const removed = [...editable.values()].filter((i) => !keptIds.has(i.id));
    const changes: string[] = [];
    const ops: Prisma.PrismaPromise<unknown>[] = [];

    for (const item of removed) {
      changes.push(`"${item.name}" o'chirildi`);
    }
    if (removed.length) {
      ops.push(
        this.prisma.shoppingListItem.deleteMany({
          where: { id: { in: removed.map((i) => i.id) } },
        }),
      );
    }

    for (const input of dto.items) {
      const quantity = new Prisma.Decimal(input.quantity);
      const note = input.note?.trim() || null;

      if (!input.id) {
        changes.push(
          `"${input.name}" (${input.quantity} ${input.unit}) qo'shildi`,
        );
        ops.push(
          this.prisma.shoppingListItem.create({
            data: {
              shoppingListId: id,
              name: input.name,
              quantity,
              originalQuantity: 0,
              unit: input.unit,
              note,
            },
          }),
        );
        continue;
      }

      const existing = editable.get(input.id)!;
      const quantityChanged = !existing.quantity.equals(quantity);
      if (
        !quantityChanged &&
        existing.name === input.name &&
        existing.unit === input.unit &&
        existing.note === note
      ) {
        continue;
      }

      // Keep the chef's first figure; forget it if SUPER_ADMIN changes back.
      let originalQuantity = existing.originalQuantity;
      if (quantityChanged) {
        originalQuantity = existing.originalQuantity ?? existing.quantity;
        if (originalQuantity.equals(quantity)) originalQuantity = null;
      }

      if (quantityChanged) {
        changes.push(
          `"${existing.name}": ${existing.quantity} → ${input.quantity} ${input.unit}`,
        );
      } else {
        changes.push(`"${existing.name}" tahrirlandi`);
      }
      ops.push(
        this.prisma.shoppingListItem.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            quantity,
            originalQuantity,
            unit: input.unit,
            note,
          },
        }),
      );
    }

    if (ops.length === 0) return list;
    await this.prisma.$transaction(ops);

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'SHOPPING_LIST',
      entityId: id,
      description: `${list.createdByWorker.fullName}ning bozorlik ro'yxatini tahrirladi: ${changes.join('; ')}`,
    });
    void this.telegram.notifyListEdited(id);

    return this.findOne(id);
  }

  async approve(id: string, actorId: string, actorName: string) {
    const list = await this.findOne(id);
    if (!NOT_YET_SENT_STATUSES.includes(list.status)) {
      throw new BadRequestException("Bu ro'yxat allaqachon adminga yuborilgan");
    }
    if (list.items.length === 0) {
      throw new BadRequestException("Bo'sh ro'yxatni yuborib bo'lmaydi");
    }

    const now = new Date();
    const updated = await this.prisma.shoppingList.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actorId,
        approvedAt: now,
        reviewedById: list.reviewedById ?? actorId,
        reviewedAt: list.reviewedAt ?? now,
      },
      include,
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'STATUS_CHANGE',
      entityType: 'SHOPPING_LIST',
      entityId: id,
      description: `${list.createdByWorker.fullName}ning bozorlik ro'yxatini tasdiqlab, adminga yubordi`,
    });
    void this.telegram.notifyListApproved(id);

    return updated;
  }

  /**
   * Called when staff open the shopping lists page so the notification badge
   * clears on next load. SUPER_ADMIN's badge counts lists fresh from chefs;
   * ADMIN's counts lists SUPER_ADMIN has just sent them.
   */
  async markAllSeen(role: StaffRole | undefined, reviewedById: string) {
    if (role === 'ADMIN') {
      await this.prisma.shoppingList.updateMany({
        where: { status: 'APPROVED', adminSeenAt: null },
        data: { adminSeenAt: new Date() },
      });
      return;
    }
    await this.prisma.shoppingList.updateMany({
      where: { status: 'SUBMITTED' },
      data: { status: 'REVIEWED', reviewedById, reviewedAt: new Date() },
    });
  }

  async markItemPurchased(
    listId: string,
    itemId: string,
    dto: MarkPurchasedDto,
    actorId: string,
    actorName: string,
    role?: StaffRole,
  ) {
    const list = await this.findOne(listId, role);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Ro'yxat elementi topilmadi");
    if (item.isPurchased) {
      throw new BadRequestException(
        'Bu mahsulot allaqachon sotib olingan deb belgilangan',
      );
    }

    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Mahsulotni faqat admin xarid qilgan deb belgilashi mumkin',
      );
    }
    if (list.status !== 'APPROVED') {
      throw new BadRequestException(
        "Xarid faqat super admin yuborgan ro'yxatda qilinadi",
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
          data: { status: 'PURCHASED' },
        });
      }
    });

    await this.auditLog.record({
      actorId,
      actorName,
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
    role?: StaffRole,
  ) {
    const list = await this.findOne(listId, role);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Ro'yxat elementi topilmadi");
    if (!item.isPurchased) {
      throw new BadRequestException(
        'Narxni faqat sotib olingan mahsulot uchun tuzatish mumkin',
      );
    }
    const { unitPrice, totalCost } = this.resolvePrice(dto, item.quantity);
    await this.prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { unitPrice, totalCost },
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
      return {
        unitPrice,
        totalCost: unitPrice.mul(quantity).toDecimalPlaces(2),
      };
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
