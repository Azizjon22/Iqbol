import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { CreateMenuDishDto } from './dto/create-menu-dish.dto';
import { CreateMenuMediaDto } from './dto/create-menu-media.dto';
import { UpdateMenuDishDto } from './dto/update-menu-dish.dto';
import { UpdateMenuMediaDto } from './dto/update-menu-media.dto';

@Injectable()
export class MenusService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private uploads: UploadsService,
  ) {}

  /**
   * A restart in the middle of a video's preparation leaves its row stuck on
   * PROCESSING with nobody working on it. The original file is still there,
   * so pick each one up again.
   */
  async onModuleInit() {
    const stuck = await this.prisma.menuMedia.findMany({
      where: { mediaType: 'VIDEO', processingStatus: 'PROCESSING' },
      select: { id: true, url: true },
    });
    for (const media of stuck) {
      await this.prisma.menuMedia.update({
        where: { id: media.id },
        data: { processingStatus: 'READY' },
      });
      await this.prepareVideo(media.id, media.url);
    }
  }

  /**
   * Starts the background work that makes an uploaded video play smoothly
   * everywhere, and tracks it on the row. Returns the status to report now.
   */
  private async prepareVideo(mediaId: string, url: string) {
    const started = await this.uploads.prepareVideo(url, (result) =>
      this.prisma.menuMedia
        .update({
          where: { id: mediaId },
          data: result.ok
            ? { url: result.url, processingStatus: 'READY' }
            : { processingStatus: 'FAILED' },
        })
        // The media may have been deleted while its video was being prepared.
        .catch(() => undefined),
    );
    if (!started) return 'READY' as const;
    await this.prisma.menuMedia.update({
      where: { id: mediaId },
      data: { processingStatus: 'PROCESSING' },
    });
    return 'PROCESSING' as const;
  }

  findAll() {
    return this.prisma.menu.findMany({
      include: {
        dishes: { orderBy: { order: 'asc' } },
        media: { orderBy: { order: 'asc' } },
      },
      orderBy: [{ guestCount: 'asc' }, { pricePerPerson: 'asc' }],
    });
  }

  async findOne(id: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        dishes: { orderBy: { order: 'asc' } },
        media: { orderBy: { order: 'asc' } },
      },
    });
    if (!menu) throw new NotFoundException('Menyu topilmadi');
    return menu;
  }

  /** How many weddings use each menu — staff-only, drives the delete guard. */
  async usage() {
    const rows = await this.prisma.event.groupBy({
      by: ['menuId'],
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.menuId, r._count._all]));
  }

  async create(dto: CreateMenuDto, actorId: string, actorName: string) {
    const menu = await this.prisma.menu.create({ data: dto });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'MENU',
      entityId: menu.id,
      description: `"${menu.name}" menyusini yaratdi`,
    });
    return menu;
  }

  async update(
    id: string,
    dto: UpdateMenuDto,
    actorId: string,
    actorName: string,
  ) {
    const existing = await this.ensureExists(id);
    const menu = await this.prisma.menu.update({ where: { id }, data: dto });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'MENU',
      entityId: menu.id,
      description: `"${existing.name}" menyusini tahrirladi`,
    });
    return menu;
  }

  async remove(id: string, actorId: string, actorName: string) {
    const existing = await this.ensureExists(id);
    // Weddings keep a hard reference to their menu — refuse with a clear
    // message instead of letting the FK constraint surface as a 500.
    const eventCount = await this.prisma.event.count({ where: { menuId: id } });
    if (eventCount > 0) {
      throw new ConflictException(
        `Bu menyu ${eventCount} ta to'yda ishlatilgan — uni o'chirib bo'lmaydi`,
      );
    }
    await this.prisma.menu.delete({ where: { id } });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'MENU',
      entityId: id,
      description: `"${existing.name}" menyusini butunlay o'chirdi`,
    });
    return { success: true };
  }

  /** Copies a menu with all its dishes and media, e.g. to build a new tier. */
  async duplicate(id: string, actorId: string, actorName: string) {
    const source = await this.findOne(id);
    const copy = await this.prisma.menu.create({
      data: {
        name: `${source.name} (nusxa)`,
        pricePerPerson: source.pricePerPerson,
        guestCount: source.guestCount,
        description: source.description,
        coverImageUrl: source.coverImageUrl,
        isVip: source.isVip,
        dishes: {
          create: source.dishes.map((d) => ({
            category: d.category,
            name: d.name,
            description: d.description,
            photoUrl: d.photoUrl,
            order: d.order,
          })),
        },
        media: {
          create: source.media.map((m) => ({
            section: m.section,
            mediaType: m.mediaType,
            url: m.url,
            caption: m.caption,
            order: m.order,
          })),
        },
      },
    });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'MENU',
      entityId: copy.id,
      description: `"${source.name}" menyusidan nusxa oldi`,
    });
    return copy;
  }

  async addDish(
    menuId: string,
    dto: CreateMenuDishDto,
    actorId: string,
    actorName: string,
  ) {
    const menu = await this.ensureExists(menuId);
    const last = await this.prisma.menuDish.aggregate({
      where: { menuId },
      _max: { order: true },
    });
    const dish = await this.prisma.menuDish.create({
      data: { ...dto, menuId, order: dto.order ?? (last._max.order ?? -1) + 1 },
    });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'MENU_DISH',
      entityId: dish.id,
      description: `"${menu.name}" menyusiga "${dto.name}" taomini qo'shdi`,
    });
    return dish;
  }

  async updateDish(
    menuId: string,
    dishId: string,
    dto: UpdateMenuDishDto,
    actorId: string,
    actorName: string,
  ) {
    const menu = await this.ensureExists(menuId);
    const existing = await this.findDishOrThrow(menuId, dishId);
    const dish = await this.prisma.menuDish.update({
      where: { id: dishId },
      data: dto,
    });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'MENU_DISH',
      entityId: dishId,
      description: `"${menu.name}" menyusidagi "${existing.name}" taomini tahrirladi`,
    });
    return dish;
  }

  async reorderDishes(menuId: string, ids: string[]) {
    await this.ensureExists(menuId);
    const owned = await this.prisma.menuDish.count({
      where: { menuId, id: { in: ids } },
    });
    if (owned !== new Set(ids).size) {
      throw new BadRequestException("Taomlar ro'yxati noto'g'ri");
    }
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.menuDish.update({ where: { id }, data: { order } }),
      ),
    );
    return this.findOne(menuId);
  }

  async removeDish(
    menuId: string,
    dishId: string,
    actorId: string,
    actorName: string,
  ) {
    const menu = await this.ensureExists(menuId);
    const dish = await this.findDishOrThrow(menuId, dishId);
    await this.prisma.menuDish.delete({ where: { id: dishId } });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'MENU_DISH',
      entityId: dishId,
      description: `"${menu.name}" menyusidan "${dish?.name ?? 'taom'}"ni o'chirdi`,
    });
    return { success: true };
  }

  async addMedia(
    menuId: string,
    dto: CreateMenuMediaDto,
    actorId: string,
    actorName: string,
  ) {
    const menu = await this.ensureExists(menuId);
    const last = await this.prisma.menuMedia.aggregate({
      where: { menuId },
      _max: { order: true },
    });
    const media = await this.prisma.menuMedia.create({
      data: { ...dto, menuId, order: dto.order ?? (last._max.order ?? -1) + 1 },
    });
    if (dto.mediaType === 'VIDEO') {
      media.processingStatus = await this.prepareVideo(media.id, dto.url);
    }
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'MENU_MEDIA',
      entityId: media.id,
      description: `"${menu.name}" menyusiga ${dto.mediaType === 'VIDEO' ? 'video' : 'rasm'} qo'shdi`,
    });
    return media;
  }

  async updateMedia(
    menuId: string,
    mediaId: string,
    dto: UpdateMenuMediaDto,
    actorId: string,
    actorName: string,
  ) {
    const menu = await this.ensureExists(menuId);
    const existing = await this.findMediaOrThrow(menuId, mediaId);
    const media = await this.prisma.menuMedia.update({
      where: { id: mediaId },
      // A new file starts from a clean status.
      data: dto.url ? { ...dto, processingStatus: 'READY' } : dto,
    });
    if (dto.url && (dto.mediaType ?? existing.mediaType) === 'VIDEO') {
      media.processingStatus = await this.prepareVideo(mediaId, dto.url);
    }
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'MENU_MEDIA',
      entityId: mediaId,
      description: `"${menu.name}" menyusidagi faylni tahrirladi`,
    });
    return media;
  }

  async reorderMedia(menuId: string, ids: string[]) {
    await this.ensureExists(menuId);
    const owned = await this.prisma.menuMedia.count({
      where: { menuId, id: { in: ids } },
    });
    if (owned !== new Set(ids).size) {
      throw new BadRequestException("Fayllar ro'yxati noto'g'ri");
    }
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.menuMedia.update({ where: { id }, data: { order } }),
      ),
    );
    return this.findOne(menuId);
  }

  async removeMedia(
    menuId: string,
    mediaId: string,
    actorId: string,
    actorName: string,
  ) {
    const menu = await this.ensureExists(menuId);
    await this.findMediaOrThrow(menuId, mediaId);
    await this.prisma.menuMedia.delete({ where: { id: mediaId } });
    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'MENU_MEDIA',
      entityId: mediaId,
      description: `"${menu.name}" menyusidan faylni o'chirdi`,
    });
    return { success: true };
  }

  // Scoped by menuId so one menu's routes can never touch another's items.
  private async findDishOrThrow(menuId: string, dishId: string) {
    const dish = await this.prisma.menuDish.findFirst({
      where: { id: dishId, menuId },
    });
    if (!dish) throw new NotFoundException('Taom topilmadi');
    return dish;
  }

  private async findMediaOrThrow(menuId: string, mediaId: string) {
    const media = await this.prisma.menuMedia.findFirst({
      where: { id: mediaId, menuId },
    });
    if (!media) throw new NotFoundException('Fayl topilmadi');
    return media;
  }

  private async ensureExists(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menyu topilmadi');
    return menu;
  }
}
