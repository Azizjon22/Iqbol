import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryTxnType, Prisma, StaffRole, Unit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { StockCountDto } from './dto/stock-count.dto';
import { TakeStockDto } from './dto/take-stock.dto';
import { TelegramService } from '../telegram/telegram.service';
import { localMidnight } from '../common/time/tashkent';
import { AuthPayload } from '../common/types/auth-payload';

/** One lot's share of a movement: how much was drawn and at what price. */
interface Allocation {
  quantity: string;
  unitPrice: string | null;
  /** When the lot it came from was opened, so a return keeps its place in line. */
  lotCreatedAt?: string;
}

const UNIT_UZ: Record<Unit, string> = { KG: 'kg', LITER: 'litr', DONA: 'dona' };

const txnInclude = {
  createdBy: { select: { id: true, fullName: true } },
  sourceShoppingListItem: {
    select: {
      shoppingList: {
        select: {
          id: true,
          event: { select: { id: true, clientName: true } },
        },
      },
    },
  },
} satisfies Prisma.InventoryTransactionInclude;

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private telegram: TelegramService,
  ) {}

  /** Prices (the lots) are the super admin's alone; everyone else gets quantities. */
  findAll(role?: StaffRole) {
    return this.prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
      include:
        role === 'SUPER_ADMIN'
          ? {
              lots: {
                where: { quantity: { gt: 0 } },
                orderBy: { createdAt: 'asc' },
              },
            }
          : undefined,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Ombor mahsuloti topilmadi');
    return item;
  }

  async create(
    dto: CreateInventoryItemDto,
    actorId: string,
    actorName: string,
    role?: StaffRole,
  ) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (existing)
      throw new ConflictException('Bu nomdagi mahsulot allaqachon mavjud');
    const item = await this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
        nameRu: dto.nameRu,
        category: dto.category,
        productCategory: dto.productCategory,
        photoUrl: dto.photoUrl,
        unit: dto.unit,
        minThreshold: dto.minThreshold,
      },
    });
    // Opening stock goes through the ledger too, so history sums to the balance.
    if (dto.quantity && dto.quantity > 0) {
      await this.move(
        item.id,
        'IN',
        dto.quantity,
        "Boshlang'ich qoldiq",
        undefined,
        actorId,
        role === 'SUPER_ADMIN' ? dto.unitPrice : undefined,
      );
    }

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'INVENTORY_ITEM',
      entityId: item.id,
      description: `Omborga "${item.name}" mahsulotini qo'shdi`,
    });

    return this.findOne(item.id);
  }

  /**
   * Read-only product catalog for building shopping lists — reachable by
   * chefs (WORKER kind) as well as staff, unlike the rest of this module.
   */
  productCatalog() {
    return this.prisma.inventoryItem.findMany({
      where: { category: 'PRODUCT' },
      select: {
        id: true,
        name: true,
        nameRu: true,
        productCategory: true,
        unit: true,
        photoUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    id: string,
    dto: UpdateInventoryItemDto,
    actorId: string,
    actorName: string,
  ) {
    const existing = await this.findOne(id);
    if (dto.name && dto.name !== existing.name) {
      const clash = await this.prisma.inventoryItem.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (clash)
        throw new ConflictException('Bu nomdagi mahsulot allaqachon mavjud');
    }
    if (dto.unit && dto.unit !== existing.unit && !existing.quantity.isZero()) {
      throw new BadRequestException(
        "Qoldig'i bor mahsulotning o'lchov birligini o'zgartirib bo'lmaydi — avval qoldiqni 0 ga tushiring",
      );
    }
    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: dto,
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'INVENTORY_ITEM',
      entityId: id,
      description: `"${existing.name}" ombor mahsulotini tahrirladi`,
    });

    return item;
  }

  async remove(id: string, actorId: string, actorName: string) {
    const existing = await this.findOne(id);
    // What a wedding took from the store is part of that wedding's costs.
    const used = await this.prisma.stockUsageItem.count({
      where: { itemId: id },
    });
    if (used > 0) {
      throw new ConflictException(
        `"${existing.name}" to'ylar uchun ombordan olingan — to'y xarajatlari saqlanishi uchun uni o'chirib bo'lmaydi`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.inventoryTransaction.deleteMany({ where: { itemId: id } }),
      this.prisma.inventoryItem.delete({ where: { id } }),
    ]);

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'INVENTORY_ITEM',
      entityId: id,
      description: `"${existing.name}" mahsulotini ombordan butunlay o'chirdi`,
    });

    return { success: true };
  }

  async addTransaction(
    itemId: string,
    dto: CreateTransactionDto,
    actorId: string,
    actorName: string,
    role?: StaffRole,
  ) {
    const item = await this.findOne(itemId);
    const transaction = await this.move(
      item.id,
      dto.type,
      dto.quantity,
      dto.note,
      dto.noteRu,
      actorId,
      dto.type === 'IN' && role === 'SUPER_ADMIN' ? dto.unitPrice : undefined,
    );

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'INVENTORY_ITEM',
      entityId: itemId,
      description: `"${item.name}" uchun ${dto.type === 'IN' ? 'kirim' : 'chiqim'}: ${dto.quantity} ${UNIT_UZ[item.unit]}${dto.note ? ` (${dto.note})` : ''}`,
    });

    return transaction;
  }

  /**
   * Stocktake: records the difference between the counted and the recorded
   * quantity as an ordinary IN/OUT row, so the history still adds up.
   */
  async count(
    itemId: string,
    dto: StockCountDto,
    actorId: string,
    actorName: string,
  ) {
    const item = await this.findOne(itemId);
    const actual = new Prisma.Decimal(dto.actual);
    const diff = actual.sub(item.quantity);
    if (diff.isZero()) return { unchanged: true };

    const note = ['Inventarizatsiya', dto.note?.trim()]
      .filter(Boolean)
      .join(': ');
    const noteRu = dto.noteRu?.trim()
      ? ['Инвентаризация', dto.noteRu.trim()].join(': ')
      : undefined;
    const transaction = await this.move(
      item.id,
      diff.isPositive() ? 'IN' : 'OUT',
      diff.abs().toNumber(),
      note,
      noteRu,
      actorId,
    );

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'INVENTORY_ITEM',
      entityId: itemId,
      description: `"${item.name}" inventarizatsiya: ${item.quantity} → ${actual} ${UNIT_UZ[item.unit]}`,
    });

    return transaction;
  }

  /** Applies one stock movement in its own transaction. */
  private move(
    itemId: string,
    type: InventoryTxnType,
    quantity: number,
    note: string | undefined,
    noteRu: string | undefined,
    actorId: string | null,
    unitPrice?: number | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { transaction } = await this.moveIn(
        tx,
        itemId,
        type,
        new Prisma.Decimal(quantity),
        note,
        actorId,
        unitPrice,
        undefined,
        noteRu,
      );
      return transaction;
    });
  }

  /**
   * A stock movement inside a caller's transaction. The item row is locked
   * first, so two movements of the same item run one after the other and
   * neither the balance nor the lots can be overdrawn.
   *
   * Kirim joins the newest lot when the price matches (or when no price is
   * given), otherwise opens a new lot. Chiqim empties the oldest lot first.
   */
  private async moveIn(
    tx: Prisma.TransactionClient,
    itemId: string,
    type: InventoryTxnType,
    amount: Prisma.Decimal,
    note: string | undefined,
    actorId: string | null,
    unitPrice?: number | null,
    /** Set when stock is being put back: the opening date of its original lot. */
    restoreTo?: Date,
    noteRu?: string,
  ) {
    await tx.$queryRaw`SELECT id FROM inventory_items WHERE id = ${itemId} FOR UPDATE`;
    const updated = await tx.inventoryItem.updateMany({
      where:
        type === 'OUT'
          ? { id: itemId, quantity: { gte: amount } }
          : { id: itemId },
      data: {
        quantity: type === 'IN' ? { increment: amount } : { decrement: amount },
      },
    });
    if (updated.count === 0) {
      throw new BadRequestException('Ombordagi mahsulot yetarli emas');
    }

    const lots = await tx.inventoryLot.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
    });
    const newest = lots[lots.length - 1];
    const allocations: Allocation[] = [];

    if (type === 'IN') {
      const price =
        unitPrice === undefined
          ? (newest?.unitPrice ?? null)
          : unitPrice === null
            ? null
            : new Prisma.Decimal(unitPrice).toDecimalPlaces(2);
      const samePrice = (lot: (typeof lots)[number]) =>
        lot.unitPrice === null
          ? price === null
          : price !== null && lot.unitPrice.equals(price);
      // A new delivery only joins the newest lot. Returned stock goes back to
      // whichever lot has its price, or reopens its lot at its old place in
      // line, so the older (cheaper) stock is still the first to be used.
      const target = restoreTo
        ? lots.find(samePrice)
        : newest && samePrice(newest)
          ? newest
          : undefined;
      if (target) {
        await tx.inventoryLot.update({
          where: { id: target.id },
          data: { quantity: { increment: amount } },
        });
      } else {
        await tx.inventoryLot.create({
          data: {
            itemId,
            quantity: amount,
            unitPrice: price,
            createdAt: restoreTo,
          },
        });
      }
    } else {
      let left = amount;
      for (const lot of lots) {
        if (left.lessThanOrEqualTo(0)) break;
        if (lot.quantity.lessThanOrEqualTo(0)) continue;
        const take = Prisma.Decimal.min(lot.quantity, left);
        allocations.push({
          quantity: take.toString(),
          unitPrice: lot.unitPrice?.toString() ?? null,
          lotCreatedAt: lot.createdAt.toISOString(),
        });
        left = left.sub(take);
        // An emptied lot goes, except the newest: it remembers the last
        // price for a kirim entered without one.
        if (take.equals(lot.quantity) && lot.id !== newest.id) {
          await tx.inventoryLot.delete({ where: { id: lot.id } });
        } else {
          await tx.inventoryLot.update({
            where: { id: lot.id },
            data: { quantity: { decrement: take } },
          });
        }
      }
      // Balance without a lot behind it (should not happen): cost unknown.
      if (left.greaterThan(0)) {
        allocations.push({ quantity: left.toString(), unitPrice: null });
      }
    }

    const transaction = await tx.inventoryTransaction.create({
      data: {
        itemId,
        type,
        quantity: amount,
        note,
        noteRu,
        createdById: actorId,
      },
      include: txnInclude,
    });
    return { transaction, allocations };
  }

  /** The super admin prices a lot that came in without one. */
  async setLotPrice(
    lotId: string,
    unitPrice: number,
    actorId: string,
    actorName: string,
  ) {
    const lot = await this.prisma.inventoryLot.findUnique({
      where: { id: lotId },
      include: { item: { select: { name: true, unit: true } } },
    });
    if (!lot) throw new NotFoundException('Partiya topilmadi');
    const updated = await this.prisma.inventoryLot.update({
      where: { id: lotId },
      data: { unitPrice: new Prisma.Decimal(unitPrice).toDecimalPlaces(2) },
    });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'INVENTORY_ITEM',
      entityId: lot.itemId,
      description: `"${lot.item.name}" narxini belgiladi: ${unitPrice.toLocaleString('ru-RU')} so'm (1 ${UNIT_UZ[lot.item.unit]})`,
    });
    return updated;
  }

  // ------------------------------------------------- Taken for a wedding

  /** What is on the shelves, for the chef: quantities only, never prices. */
  stockForChef() {
    return this.prisma.inventoryItem.findMany({
      where: { category: 'PRODUCT' },
      select: {
        id: true,
        name: true,
        productCategory: true,
        unit: true,
        quantity: true,
        photoUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /** The chef's own recent withdrawals — no costs. */
  myUsages(workerId: string) {
    return this.prisma.stockUsage.findMany({
      where: { workerId },
      select: {
        id: true,
        createdAt: true,
        event: { select: { id: true, clientName: true, eventDate: true } },
        items: {
          select: { id: true, name: true, unit: true, quantity: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  /**
   * A chef takes products from the store for today's or tomorrow's wedding.
   * Stock goes down, oldest lot first, and what it cost is kept with the
   * wedding for the super admin.
   */
  async takeForEvent(dto: TakeStockDto, worker: AuthPayload) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event) throw new BadRequestException("To'y topilmadi");
    const now = new Date();
    if (
      event.status === 'CANCELLED' ||
      event.eventDate < localMidnight(now) ||
      event.eventDate >= localMidnight(now, 2)
    ) {
      throw new BadRequestException(
        "Ombordan faqat bugungi yoki ertangi to'y uchun olish mumkin",
      );
    }

    // One line per product, in a fixed order so two chefs can't deadlock.
    const wanted = new Map<string, Prisma.Decimal>();
    for (const input of dto.items) {
      wanted.set(
        input.itemId,
        (wanted.get(input.itemId) ?? new Prisma.Decimal(0)).add(input.quantity),
      );
    }
    const itemIds = [...wanted.keys()].sort();

    const usage = await this.prisma.$transaction(async (tx) => {
      const lines: Prisma.StockUsageItemCreateWithoutUsageInput[] = [];
      for (const itemId of itemIds) {
        const item = await tx.inventoryItem.findUnique({
          where: { id: itemId },
        });
        if (!item || item.category !== 'PRODUCT') {
          throw new BadRequestException('Ombor mahsuloti topilmadi');
        }
        const quantity = wanted.get(itemId)!;
        if (item.quantity.lessThan(quantity)) {
          throw new BadRequestException(
            `"${item.name}" omborda yetarli emas — bor: ${item.quantity.toString()} ${UNIT_UZ[item.unit]}`,
          );
        }
        const { allocations } = await this.moveIn(
          tx,
          itemId,
          'OUT',
          quantity,
          `To'yga olindi: ${event.clientName} (${worker.fullName})`,
          null,
        );
        const priced = allocations.every((a) => a.unitPrice !== null);
        lines.push({
          item: { connect: { id: itemId } },
          name: item.name,
          unit: item.unit,
          quantity,
          totalCost: priced
            ? allocations
                .reduce(
                  (sum, a) =>
                    sum.add(new Prisma.Decimal(a.quantity).mul(a.unitPrice!)),
                  new Prisma.Decimal(0),
                )
                .toDecimalPlaces(2)
            : null,
          allocations: allocations as unknown as Prisma.InputJsonValue,
        });
      }
      return tx.stockUsage.create({
        data: {
          eventId: event.id,
          workerId: worker.sub,
          items: { create: lines },
        },
        select: { id: true },
      });
    });

    await this.auditLog.record({
      actorId: null,
      actorName: worker.fullName,
      action: 'CREATE',
      entityType: 'INVENTORY_ITEM',
      entityId: usage.id,
      description: `Ombordan "${event.clientName}" to'yi uchun ${itemIds.length} xil mahsulot oldi`,
    });
    void this.telegram.notifyStockUsage(usage.id);
    return { id: usage.id };
  }

  /**
   * Puts a withdrawal back: every product returns to the store at the price
   * it was taken at. A chef may undo their own on the same day; after that
   * (or for anyone else's) it takes the super admin.
   */
  async returnUsage(id: string, user: AuthPayload) {
    const usage = await this.prisma.stockUsage.findUnique({
      where: { id },
      include: { items: true, event: { select: { clientName: true } } },
    });
    if (!usage) throw new NotFoundException('Yozuv topilmadi');
    if (user.kind === 'WORKER') {
      if (
        usage.workerId !== user.sub ||
        usage.createdAt < localMidnight(new Date())
      ) {
        throw new BadRequestException(
          "Faqat bugun o'zingiz olgan mahsulotni qaytarishingiz mumkin — boshqasini super admin tuzatadi",
        );
      }
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException("Bu amal uchun ruxsatingiz yo'q");
    }

    const actorId = user.kind === 'STAFF' ? user.sub : null;
    await this.prisma.$transaction(async (tx) => {
      for (const line of [...usage.items].sort((a, b) =>
        a.itemId.localeCompare(b.itemId),
      )) {
        for (const part of line.allocations as unknown as Allocation[]) {
          await this.moveIn(
            tx,
            line.itemId,
            'IN',
            new Prisma.Decimal(part.quantity),
            `To'ydan qaytarildi: ${usage.event.clientName} (${user.fullName})`,
            actorId,
            part.unitPrice === null ? null : Number(part.unitPrice),
            part.lotCreatedAt ? new Date(part.lotCreatedAt) : new Date(),
          );
        }
      }
      await tx.stockUsage.delete({ where: { id } });
    });

    await this.auditLog.record({
      actorId,
      actorName: user.fullName,
      action: 'DELETE',
      entityType: 'INVENTORY_ITEM',
      entityId: id,
      description: `"${usage.event.clientName}" to'yi uchun ombordan olingan mahsulotlarni qaytardi`,
    });
    void this.telegram.notifyStockReturned(
      usage.telegramMessages,
      user.fullName,
    );
    return { success: true };
  }

  listTransactions(itemId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      include: txnInclude,
    });
  }

  /** Latest movements across the whole store, for the activity feed. */
  recentTransactions(limit = 20) {
    return this.prisma.inventoryTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        ...txnInclude,
        item: { select: { id: true, name: true, unit: true, category: true } },
      },
    });
  }

  async lowStock() {
    const items = await this.prisma.inventoryItem.findMany({
      where: { minThreshold: { not: null } },
      orderBy: { name: 'asc' },
    });
    return items.filter(
      (item) =>
        item.minThreshold && item.quantity.lessThanOrEqualTo(item.minThreshold),
    );
  }
}
