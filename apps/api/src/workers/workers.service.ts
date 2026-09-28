import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { FindWorkersQuery } from './dto/find-workers.query';

@Injectable()
export class WorkersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async register(dto: RegisterWorkerDto) {
    const existing = await this.prisma.worker.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(
        "Bu telefon raqami bilan ishchi allaqachon ro'yxatdan o'tgan",
      );
    }

    const pinHash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;

    const worker = await this.prisma.worker.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        position: dto.position,
        gender: dto.gender,
        photoUrl: dto.photoUrl,
        pinHash,
      },
    });

    return this.toSafe(worker);
  }

  async createByStaff(
    dto: RegisterWorkerDto,
    actorId: string,
    actorName: string,
  ) {
    const existing = await this.prisma.worker.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(
        "Bu telefon raqami bilan ishchi allaqachon ro'yxatdan o'tgan",
      );
    }

    const pinHash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;

    const worker = await this.prisma.worker.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        position: dto.position,
        gender: dto.gender,
        photoUrl: dto.photoUrl,
        pinHash,
        mustChangePin: Boolean(dto.pin),
        status: 'APPROVED',
        approvedById: actorId,
      },
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'CREATE',
      entityType: 'WORKER',
      entityId: worker.id,
      description: `"${worker.fullName}" ishchisini qo'shdi va tasdiqladi`,
    });

    return this.toSafe(worker);
  }

  async findAll(query: FindWorkersQuery) {
    const workers = await this.prisma.worker.findMany({
      where: {
        status: query.status,
        position: query.position,
        gender: query.gender,
      },
      orderBy: { createdAt: 'desc' },
    });
    return workers.map((w) => this.toSafe(w));
  }

  async findOne(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Ishchi topilmadi');
    return this.toSafe(worker);
  }

  async approve(id: string, actorId: string, actorName: string) {
    const existing = await this.ensureExists(id);
    const worker = await this.prisma.worker.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: actorId },
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'APPROVE',
      entityType: 'WORKER',
      entityId: id,
      description: `"${existing.fullName}" ishchisini tasdiqladi`,
    });

    return this.toSafe(worker);
  }

  async reject(id: string, actorId: string, actorName: string) {
    const existing = await this.ensureExists(id);
    const worker = await this.prisma.worker.update({
      where: { id },
      data: { status: 'REJECTED', approvedById: actorId },
    });

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'REJECT',
      entityType: 'WORKER',
      entityId: id,
      description: `"${existing.fullName}" ishchisini rad etdi`,
    });

    return this.toSafe(worker);
  }

  async update(
    id: string,
    dto: UpdateWorkerDto,
    actorId: string,
    actorName: string,
  ) {
    const existing = await this.ensureExists(id);
    if (dto.phone && dto.phone !== existing.phone) {
      const taken = await this.prisma.worker.findUnique({
        where: { phone: dto.phone },
      });
      if (taken) {
        throw new ConflictException(
          `Bu telefon raqam "${taken.fullName}" ishchisiga tegishli`,
        );
      }
    }
    const pinHash = dto.pin ? await bcrypt.hash(dto.pin, 10) : undefined;
    const worker = await this.prisma.worker.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        position: dto.position,
        gender: dto.gender,
        photoUrl: dto.photoUrl,
        pinHash,
        mustChangePin: dto.pin ? true : undefined,
      },
    });

    const changes: string[] = [];
    if (dto.fullName && dto.fullName !== existing.fullName)
      changes.push(`ism: ${dto.fullName}`);
    if (dto.phone && dto.phone !== existing.phone)
      changes.push(`telefon: ${dto.phone}`);
    if (dto.position && dto.position !== existing.position)
      changes.push('lavozim');
    if (dto.pin) changes.push('PIN kodni tikladi');

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'UPDATE',
      entityType: 'WORKER',
      entityId: id,
      description: `"${existing.fullName}" ishchisi ma'lumotlarini tahrirladi${changes.length ? ` (${changes.join(', ')})` : ''}`,
    });

    return this.toSafe(worker);
  }

  async remove(id: string, actorId: string, actorName: string) {
    const existing = await this.ensureExists(id);
    try {
      await this.prisma.worker.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new ConflictException(
          "Bu ishchi bozorlik ro'yxati yaratgan, shuning uchun o'chirib bo'lmaydi. Buning o'rniga uni \"Rad etilgan\" holatiga o'tkazing.",
        );
      }
      throw err;
    }

    await this.auditLog.record({
      actorId,
      actorName,
      action: 'DELETE',
      entityType: 'WORKER',
      entityId: id,
      description: `"${existing.fullName}" ishchisini butunlay o'chirdi`,
    });

    return { success: true };
  }

  private async ensureExists(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Ishchi topilmadi');
    return worker;
  }

  private toSafe<T extends { pinHash: string | null }>(worker: T) {
    const { pinHash, ...safe } = worker;
    return { ...safe, hasPin: Boolean(pinHash) };
  }
}
