import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateBrandDto } from './dto/update-brand.dto';

const ID = 'app';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
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
      updatedAt: row.updatedAt,
    };
  }

  async updateBrand(dto: UpdateBrandDto, actorId: string, actorName: string) {
    const before = await this.getBrand();
    const brandName = dto.brandName?.trim();
    const row = await this.prisma.appSettings.upsert({
      where: { id: ID },
      create: {
        id: ID,
        brandName: brandName || undefined,
        logoUrl: dto.logoUrl ?? null,
      },
      update: { brandName: brandName || undefined, logoUrl: dto.logoUrl },
    });

    const changes: string[] = [];
    if (brandName && brandName !== before.brandName)
      changes.push(`nom: "${before.brandName}" → "${brandName}"`);
    if (dto.logoUrl !== undefined && dto.logoUrl !== before.logoUrl) {
      changes.push(dto.logoUrl ? 'logo yangilandi' : 'logo olib tashlandi');
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
      updatedAt: row.updatedAt,
    };
  }
}
