import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHmac, timingSafeEqual } from 'crypto';
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

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private auditLog: AuditLogService,
  ) {}

  /** Throws while a `lockedUntil` timestamp is still in the future. */
  private assertNotLocked(lockedUntil: Date | null) {
    if (lockedUntil && lockedUntil > new Date()) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000),
      );
      throw new UnauthorizedException(
        `Ko'p marta xato urinish sabab hisob vaqtincha bloklandi. ${minutesLeft} daqiqadan keyin qayta urinib ko'ring.`,
      );
    }
  }

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
    this.assertNotLocked(staff.lockedUntil);
    const valid = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!valid) {
      const failedLoginCount = staff.failedLoginCount + 1;
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: {
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
              : null,
        },
      });
      throw new UnauthorizedException("Login yoki parol noto'g'ri");
    }
    if (staff.failedLoginCount > 0 || staff.lockedUntil) {
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    const payload: AuthPayload = {
      sub: staff.id,
      kind: 'STAFF',
      role: staff.role,
      fullName: staff.fullName,
      mustChangePassword: staff.mustChangePassword,
      tokenVersion: staff.tokenVersion,
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
    // Only chefs have an account to sign in to. Waiters are on the roster so
    // they can be assigned to weddings, nothing more.
    if (!worker || !worker.pinHash || worker.position !== 'CHEF') {
      throw new UnauthorizedException("Login yoki PIN noto'g'ri");
    }
    if (worker.status !== 'APPROVED') {
      throw new ForbiddenException(
        "Hisobingiz hali tasdiqlanmagan. Administrator bilan bog'laning.",
      );
    }
    this.assertNotLocked(worker.lockedUntil);
    const valid = await bcrypt.compare(dto.pin, worker.pinHash);
    if (!valid) {
      const failedLoginCount = worker.failedLoginCount + 1;
      await this.prisma.worker.update({
        where: { id: worker.id },
        data: {
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
              : null,
        },
      });
      throw new UnauthorizedException("Login yoki PIN noto'g'ri");
    }
    if (worker.failedLoginCount > 0 || worker.lockedUntil) {
      await this.prisma.worker.update({
        where: { id: worker.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    const payload: AuthPayload = {
      sub: worker.id,
      kind: 'WORKER',
      fullName: worker.fullName,
      mustChangePin: worker.mustChangePin,
      tokenVersion: worker.tokenVersion,
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

  /** Checks Telegram's signature on the mini app's launch data; returns the user's id. */
  telegramIdFromInitData(initData: string): string {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN', '').trim();
    if (!token) throw new UnauthorizedException("Telegram bot o'chiq");

    const params = new URLSearchParams(initData);
    const hash = params.get('hash') ?? '';
    params.delete('hash');
    const checkString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();
    const expected = createHmac('sha256', secret).update(checkString).digest();
    const given = Buffer.from(hash, 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException("Telegram ma'lumotlari tasdiqlanmadi");
    }
    const authDate = Number(params.get('auth_date') ?? 0);
    if (!authDate || Date.now() / 1000 - authDate > 24 * 60 * 60) {
      throw new UnauthorizedException(
        'Telegram sessiyasi eskirgan — ilovani qayta oching',
      );
    }
    let telegramId: string;
    try {
      telegramId = String(
        (JSON.parse(params.get('user') ?? '{}') as { id?: number }).id ?? '',
      );
    } catch {
      telegramId = '';
    }
    if (!telegramId) {
      throw new UnauthorizedException('Telegram foydalanuvchisi aniqlanmadi');
    }
    return telegramId;
  }

  /**
   * Telegram mini app sign-in. Telegram signs the launch data with the bot
   * token; when the signature holds, the chat must already be linked to an
   * account through the bot (phone + password/PIN), and that account is
   * signed in — the same tokens a normal login would give.
   */
  async loginTelegram(initData: string) {
    const telegramId = this.telegramIdFromInitData(initData);

    // In a private chat the chat id is the user's id.
    const staff = await this.prisma.staffUser.findUnique({
      where: { telegramChatId: telegramId },
    });
    if (staff?.isActive) {
      const payload: AuthPayload = {
        sub: staff.id,
        kind: 'STAFF',
        role: staff.role,
        fullName: staff.fullName,
        mustChangePassword: staff.mustChangePassword,
        tokenVersion: staff.tokenVersion,
      };
      return {
        ...this.signTokens(payload),
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
    const worker = await this.prisma.worker.findUnique({
      where: { telegramChatId: telegramId },
    });
    if (worker && worker.status === 'APPROVED' && worker.position === 'CHEF') {
      const payload: AuthPayload = {
        sub: worker.id,
        kind: 'WORKER',
        fullName: worker.fullName,
        mustChangePin: worker.mustChangePin,
        tokenVersion: worker.tokenVersion,
      };
      return {
        ...this.signTokens(payload),
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
    throw new UnauthorizedException(
      'Telegram hisobingiz tizimga ulanmagan. Botda /start bosib, telefon raqamingiz va parolingiz (oshpaz — PIN) bilan ulaning.',
    );
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
      if (
        !staff ||
        !staff.isActive ||
        staff.tokenVersion !== payload.tokenVersion
      ) {
        throw new UnauthorizedException('Hisob faol emas');
      }
      return this.signTokens({
        sub: staff.id,
        kind: 'STAFF',
        role: staff.role,
        fullName: staff.fullName,
        mustChangePassword: staff.mustChangePassword,
        tokenVersion: staff.tokenVersion,
      });
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id: payload.sub },
    });
    if (
      !worker ||
      worker.status !== 'APPROVED' ||
      worker.position !== 'CHEF' ||
      worker.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException('Hisob faol emas');
    }
    return this.signTokens({
      sub: worker.id,
      kind: 'WORKER',
      fullName: worker.fullName,
      mustChangePin: worker.mustChangePin,
      tokenVersion: worker.tokenVersion,
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
      // Signs every other device out; this one gets fresh tokens below.
      data: {
        passwordHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
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
      tokenVersion: updated.tokenVersion,
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
      throw new BadRequestException(
        'Yangi PIN avvalgisidan farq qilishi kerak',
      );
    }

    const pinHash = await bcrypt.hash(dto.newPin, 10);
    const updated = await this.prisma.worker.update({
      where: { id: worker.id },
      data: {
        pinHash,
        mustChangePin: false,
        tokenVersion: { increment: 1 },
      },
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
      tokenVersion: updated.tokenVersion,
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
