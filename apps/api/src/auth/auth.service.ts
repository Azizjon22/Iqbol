import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthPayload } from '../common/types/auth-payload';
import { StaffLoginDto } from './dto/staff-login.dto';
import { WorkerLoginDto } from './dto/worker-login.dto';
import { ChangeStaffPasswordDto } from './dto/change-staff-password.dto';
import { ChangeWorkerPinDto } from './dto/change-worker-pin.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private auditLog: AuditLogService,
  ) {}

  private signTokens(payload: AuthPayload): TokenPair {
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d'),
    });
    return { accessToken, refreshToken };
  }

  async loginStaff(dto: StaffLoginDto) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { phone: dto.phone },
    });
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException("Login yoki parol noto'g'ri");
    }
    const valid = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Login yoki parol noto'g'ri");
    }

    const payload: AuthPayload = {
      sub: staff.id,
      kind: 'STAFF',
      role: staff.role,
      fullName: staff.fullName,
      mustChangePassword: staff.mustChangePassword,
    };
    const tokens = this.signTokens(payload);
    return {
      ...tokens,
      user: {
        id: staff.id,
        fullName: staff.fullName,
        phone: staff.phone,
        role: staff.role,
        mustChangePassword: staff.mustChangePassword,
        kind: 'STAFF' as const,
      },
    };
  }

  async loginWorker(dto: WorkerLoginDto) {
    const worker = await this.prisma.worker.findUnique({
      where: { phone: dto.phone },
    });
    if (!worker || !worker.pinHash) {
      throw new UnauthorizedException("Login yoki PIN noto'g'ri");
    }
    if (worker.status !== 'APPROVED') {
      throw new ForbiddenException(
        "Hisobingiz hali tasdiqlanmagan. Administrator bilan bog'laning.",
      );
    }
    const valid = await bcrypt.compare(dto.pin, worker.pinHash);
    if (!valid) {
      throw new UnauthorizedException("Login yoki PIN noto'g'ri");
    }

    const payload: AuthPayload = {
      sub: worker.id,
      kind: 'WORKER',
      fullName: worker.fullName,
      mustChangePin: worker.mustChangePin,
    };
    const tokens = this.signTokens(payload);
    return {
      ...tokens,
      user: {
        id: worker.id,
        fullName: worker.fullName,
        phone: worker.phone,
        position: worker.position,
        mustChangePin: worker.mustChangePin,
        kind: 'WORKER' as const,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: AuthPayload;
    try {
      payload = this.jwt.verify<AuthPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sessiya muddati tugagan, qayta kiring');
    }

    if (payload.kind === 'STAFF') {
      const staff = await this.prisma.staffUser.findUnique({
        where: { id: payload.sub },
      });
      if (!staff || !staff.isActive) {
        throw new UnauthorizedException('Hisob faol emas');
      }
      return this.signTokens({
        sub: staff.id,
        kind: 'STAFF',
        role: staff.role,
        fullName: staff.fullName,
        mustChangePassword: staff.mustChangePassword,
      });
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id: payload.sub },
    });
    if (!worker || worker.status !== 'APPROVED') {
      throw new UnauthorizedException('Hisob faol emas');
    }
    return this.signTokens({
      sub: worker.id,
      kind: 'WORKER',
      fullName: worker.fullName,
      mustChangePin: worker.mustChangePin,
    });
  }

  async me(auth: AuthPayload) {
    if (auth.kind === 'STAFF') {
      const staff = await this.prisma.staffUser.findUnique({
        where: { id: auth.sub },
      });
      if (!staff) throw new UnauthorizedException();
      return {
        id: staff.id,
        fullName: staff.fullName,
        phone: staff.phone,
        role: staff.role,
        mustChangePassword: staff.mustChangePassword,
        kind: 'STAFF' as const,
      };
    }
    const worker = await this.prisma.worker.findUnique({
      where: { id: auth.sub },
    });
    if (!worker) throw new UnauthorizedException();
    return {
      id: worker.id,
      fullName: worker.fullName,
      phone: worker.phone,
      position: worker.position,
      mustChangePin: worker.mustChangePin,
      kind: 'WORKER' as const,
    };
  }

  async changeStaffPassword(auth: AuthPayload, dto: ChangeStaffPasswordDto) {
    if (auth.kind !== 'STAFF') throw new ForbiddenException();
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: auth.sub },
    });
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Hisob faol emas');
    }
    const valid = await bcrypt.compare(dto.currentPassword, staff.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Joriy parol noto'g'ri");
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Yangi parol avvalgisidan farq qilishi kerak',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.auditLog.record({
      actorId: staff.id,
      actorName: staff.fullName,
      action: 'UPDATE',
      entityType: 'STAFF_USER',
      entityId: staff.id,
      description: `"${staff.fullName}" o'z parolini yangiladi`,
    });

    const payload: AuthPayload = {
      sub: updated.id,
      kind: 'STAFF',
      role: updated.role,
      fullName: updated.fullName,
      mustChangePassword: false,
    };
    const tokens = this.signTokens(payload);
    return {
      ...tokens,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        phone: updated.phone,
        role: updated.role,
        mustChangePassword: false,
        kind: 'STAFF' as const,
      },
    };
  }

  async changeWorkerPin(auth: AuthPayload, dto: ChangeWorkerPinDto) {
    if (auth.kind !== 'WORKER') throw new ForbiddenException();
    const worker = await this.prisma.worker.findUnique({
      where: { id: auth.sub },
    });
    if (!worker || !worker.pinHash || worker.status !== 'APPROVED') {
      throw new UnauthorizedException('Hisob faol emas');
    }
    const valid = await bcrypt.compare(dto.currentPin, worker.pinHash);
    if (!valid) {
      throw new UnauthorizedException("Joriy PIN noto'g'ri");
    }
    if (dto.currentPin === dto.newPin) {
      throw new BadRequestException('Yangi PIN avvalgisidan farq qilishi kerak');
    }

    const pinHash = await bcrypt.hash(dto.newPin, 10);
    const updated = await this.prisma.worker.update({
      where: { id: worker.id },
      data: { pinHash, mustChangePin: false },
    });

    await this.auditLog.record({
      actorId: worker.id,
      actorName: worker.fullName,
      action: 'UPDATE',
      entityType: 'WORKER',
      entityId: worker.id,
      description: `"${worker.fullName}" o'z PIN kodini yangiladi`,
    });

    const payload: AuthPayload = {
      sub: updated.id,
      kind: 'WORKER',
      fullName: updated.fullName,
      mustChangePin: false,
    };
    const tokens = this.signTokens(payload);
    return {
      ...tokens,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        phone: updated.phone,
        position: updated.position,
        mustChangePin: false,
        kind: 'WORKER' as const,
      },
    };
  }
}
