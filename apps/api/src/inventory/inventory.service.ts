import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryTxnType, Prisma, Unit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { StockCountDto } from './dto/stock-count.dto';

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
  ) {}

  findAll() {
    return this.prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
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
  ) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (existing)
      throw new ConflictException('Bu nomdagi mahsulot allaqachon mavjud');
    const item = await this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
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
        actorId,
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
    const history = await this.prisma.inventoryTransaction.count({
      where: { itemId: id },
    });
    if (history > 0) {
      throw new ConflictException(
        `"${existing.name}" bo'yicha ${history} ta kirim/chiqim yozuvi bor — tarix saqlanishi uchun uni o'chirib bo'lmaydi`,
      );
    }
    await this.prisma.inventoryItem.delete({ where: { id } });

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
  ) {
    const item = await this.findOne(itemId);
    const transaction = await this.move(
      item.id,
      dto.type,
      dto.quantity,
      dto.note,
      actorId,
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
    const transaction = await this.move(
      item.id,
      diff.isPositive() ? 'IN' : 'OUT',
      diff.abs().toNumber(),
      note,
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

  /**
   * Applies a stock movement atomically: the balance check and the update
   * happen in one statement, so two simultaneous chiqims can't overdraw.
   */
  private async move(
    itemId: string,
    type: InventoryTxnType,
    quantity: number,
    note: string | undefined,
    actorId: string,
  ) {
    const amount = new Prisma.Decimal(quantity);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.updateMany({
        where:
          type === 'OUT'
            ? { id: itemId, quantity: { gte: amount } }
            : { id: itemId },
        data: {
          quantity:
            type === 'IN' ? { increment: amount } : { decrement: amount },
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Ombordagi mahsulot yetarli emas');
      }
      return tx.inventoryTransaction.create({
        data: { itemId, type, quantity: amount, note, createdById: actorId },
        include: txnInclude,
      });
    });
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
