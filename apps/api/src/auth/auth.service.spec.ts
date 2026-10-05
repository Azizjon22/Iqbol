import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

const PHONE = '+998900000001';

/** A one-row in-memory stand-in for the staff_users / workers tables. */
function fakeTable<T extends { id: string }>(row: T) {
  return {
    row,
    findUnique: jest.fn(async () => ({ ...row })),
    update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        const increment = (value as { increment?: number } | null)?.increment;
        (row as Record<string, unknown>)[key] =
          increment !== undefined
            ? ((row as Record<string, unknown>)[key] as number) + increment
            : value;
      }
      return { ...row };
    }),
  };
}

async function setup() {
  const staff = fakeTable({
    id: 'staff-1',
    fullName: 'Test Admin',
    phone: PHONE,
    role: 'SUPER_ADMIN',
    isActive: true,
    passwordHash: await bcrypt.hash('correct-horse', 4),
    mustChangePassword: false,
    tokenVersion: 0,
    failedLoginCount: 0,
    lockedUntil: null as Date | null,
  });
  const worker = fakeTable({
    id: 'worker-1',
    fullName: 'Test Chef',
    phone: PHONE,
    position: 'CHEF',
    status: 'APPROVED',
    pinHash: await bcrypt.hash('4821', 4),
    mustChangePin: false,
    tokenVersion: 0,
    failedLoginCount: 0,
    lockedUntil: null as Date | null,
  });
  const config = {
    getOrThrow: (key: string) => `${key}-test-secret`,
    get: (_key: string, fallback: string) => fallback,
  } as unknown as ConfigService;
  const service = new AuthService(
    { staffUser: staff, worker } as never,
    new JwtService(),
    config,
    { record: jest.fn() } as never,
  );
  return { service, staff, worker };
}

describe('AuthService', () => {
  it('signs a staff member in with the right password', async () => {
    const { service } = await setup();
    const result = await service.loginStaff({
      phone: PHONE,
      password: 'correct-horse',
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.user.role).toBe('SUPER_ADMIN');
  });

  it('locks a staff account after 5 wrong passwords, even for the right one', async () => {
    const { service, staff } = await setup();
    for (let i = 0; i < 5; i++) {
      await expect(
        service.loginStaff({ phone: PHONE, password: 'wrong-guess' }),
      ).rejects.toThrow("Login yoki parol noto'g'ri");
    }
    expect(staff.row.failedLoginCount).toBe(5);
    expect(staff.row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    await expect(
      service.loginStaff({ phone: PHONE, password: 'correct-horse' }),
    ).rejects.toThrow(/vaqtincha bloklandi/);
  });

  it('lets the account back in once the lock has expired, and clears the count', async () => {
    const { service, staff } = await setup();
    staff.row.failedLoginCount = 5;
    staff.row.lockedUntil = new Date(Date.now() - 1000);

    await service.loginStaff({ phone: PHONE, password: 'correct-horse' });
    expect(staff.row.failedLoginCount).toBe(0);
    expect(staff.row.lockedUntil).toBeNull();
  });

  it('locks a worker after 5 wrong PINs', async () => {
    const { service, worker } = await setup();
    for (let i = 0; i < 5; i++) {
      await expect(
        service.loginWorker({ phone: PHONE, pin: '0000' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(worker.row.lockedUntil).not.toBeNull();
    await expect(
      service.loginWorker({ phone: PHONE, pin: '4821' }),
    ).rejects.toThrow(/vaqtincha bloklandi/);
  });

  it('refuses a refresh token issued before the password was changed', async () => {
    const { service, staff } = await setup();
    const before = await service.loginStaff({
      phone: PHONE,
      password: 'correct-horse',
    });

    const changed = await service.changeStaffPassword(
      {
        sub: 'staff-1',
        kind: 'STAFF',
        role: 'SUPER_ADMIN',
        fullName: 'Test Admin',
        tokenVersion: 0,
      },
      { currentPassword: 'correct-horse', newPassword: 'battery-staple' },
    );
    expect(staff.row.tokenVersion).toBe(1);

    await expect(service.refresh(before.refreshToken)).rejects.toThrow(
      'Hisob faol emas',
    );
    // The device that changed the password keeps working.
    await expect(service.refresh(changed.refreshToken)).resolves.toHaveProperty(
      'accessToken',
    );
  });

  it('refuses to refresh a deactivated account', async () => {
    const { service, staff } = await setup();
    const tokens = await service.loginStaff({
      phone: PHONE,
      password: 'correct-horse',
    });
    staff.row.isActive = false;
    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow(
      'Hisob faol emas',
    );
  });
});
