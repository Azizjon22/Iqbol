import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UploadsService } from '../uploads/uploads.service';
import { UpdateBrandDto } from './dto/update-brand.dto';

const ID = 'app';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private uploads: UploadsService,
  ) {}

  /** Always returns a row — created with defaults on first read. */
  async getBrand() {
    const row = await this.prisma.appSettings.upsert({
      where: { id: ID },
      create: { id: ID },
      update: {},
    });
    return {
      brandName: row.brandName,
      logoUrl: row.logoUrl,
      heroMediaUrl: row.heroMediaUrl,
      heroMediaKind: row.heroMediaKind,
      heroMediaStatus: row.heroMediaStatus,
      updatedAt: row.updatedAt,
    };
  }

  async updateBrand(dto: UpdateBrandDto, actorId: string, actorName: string) {
    const before = await this.getBrand();
    const brandName = dto.brandName?.trim();
    const heroMediaUrl =
      dto.heroMediaUrl === undefined ? undefined : dto.heroMediaUrl;
    const heroMediaKind =
      heroMediaUrl === null
        ? null
        : heroMediaUrl === undefined
          ? undefined
          : (dto.heroMediaKind ?? null);
    // A new hero file starts READY; clearing it clears the status too.
    const heroMediaStatus =
      heroMediaUrl === null
        ? null
        : heroMediaUrl === undefined
          ? undefined
          : ('READY' as const);
    const row = await this.prisma.appSettings.upsert({
      where: { id: ID },
      create: {
        id: ID,
        brandName: brandName || undefined,
        logoUrl: dto.logoUrl ?? null,
        heroMediaUrl: heroMediaUrl ?? null,
        heroMediaKind: heroMediaKind ?? null,
        heroMediaStatus: heroMediaStatus ?? null,
      },
      update: {
        brandName: brandName || undefined,
        logoUrl: dto.logoUrl,
        heroMediaUrl,
        heroMediaKind,
        heroMediaStatus,
      },
    });

    if (heroMediaUrl && heroMediaKind === 'VIDEO') {
      const started = await this.uploads.prepareVideo(heroMediaUrl, (result) =>
        this.prisma.appSettings.update({
          where: { id: ID },
          data: result.ok
            ? { heroMediaUrl: result.url, heroMediaStatus: 'READY' }
            : { heroMediaStatus: 'FAILED' },
        }),
      );
      if (started) {
        await this.prisma.appSettings.update({
          where: { id: ID },
          data: { heroMediaStatus: 'PROCESSING' },
        });
        row.heroMediaStatus = 'PROCESSING';
      }
    }

    const changes: string[] = [];
    if (brandName && brandName !== before.brandName)
      changes.push(`nom: "${before.brandName}" → "${brandName}"`);
    if (dto.logoUrl !== undefined && dto.logoUrl !== before.logoUrl) {
      changes.push(dto.logoUrl ? 'logo yangilandi' : 'logo olib tashlandi');
    }
    if (heroMediaUrl !== undefined && heroMediaUrl !== before.heroMediaUrl) {
      changes.push(
        heroMediaUrl
          ? 'taqdimot foni yangilandi'
          : 'taqdimot foni olib tashlandi',
      );
    }
    if (changes.length) {
      await this.auditLog.record({
        actorId,
        actorName,
        action: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: ID,
        description: `Loyiha brendini o'zgartirdi (${changes.join(', ')})`,
      });
    }
    return {
      brandName: row.brandName,
      logoUrl: row.logoUrl,
      heroMediaUrl: row.heroMediaUrl,
      heroMediaKind: row.heroMediaKind,
      heroMediaStatus: row.heroMediaStatus,
      updatedAt: row.updatedAt,
    };
  }
}
