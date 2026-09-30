import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'APPROVE'
  | 'REJECT'
  | 'ASSIGN'
  | 'UNASSIGN';

export type AuditEntityType =
  | 'EVENT'
  | 'PAYMENT'
  | 'EXPENSE'
  | 'MENU'
  | 'MENU_DISH'
  | 'MENU_MEDIA'
  | 'INVENTORY_ITEM'
  | 'WORKER'
  | 'STAFF_USER'
  | 'SHOPPING_LIST'
  | 'SETTINGS';

interface RecordParams {
  /** null for actions by workers (chefs), who aren't staff users. */
  actorId: string | null;
  actorName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
}

/**
 * Fire-and-forget activity log for staff actions (SUPER_ADMIN-only view).
 * Never allowed to break the request it's logging: a logging failure is
 * caught and reported, not thrown, so a DB hiccup here can't turn a
 * successful create/update/delete into a 500 for the user.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  async record(params: RecordParams) {
    try {
      await this.prisma.auditLog.create({ data: params });
    } catch (err) {
      this.logger.error('Failed to write audit log entry', err as Error);
    }
  }

  findAll(limit = 300) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
