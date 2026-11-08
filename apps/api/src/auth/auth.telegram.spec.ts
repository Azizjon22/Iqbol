import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

const TOKEN = '123456:test-token';

/** Launch data signed the way Telegram signs it for a mini app. */
function signed(userId: number, token = TOKEN, authDate = Date.now() / 1000) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(authDate)),
    query_id: 'AAE',
    user: JSON.stringify({ id: userId, first_name: 'Test' }),
  });
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params;
}

function setup() {
  const staff = {
    id: 's1',
    fullName: 'Bosh',
    phone: '+998900000000',
    role: 'SUPER_ADMIN',
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 0,
  };
  const prisma = {
    staffUser: {
      findUnique: jest.fn(
        async ({ where }: { where: { telegramChatId: string } }) =>
          where.telegramChatId === '42' ? staff : null,
      ),
    },
    worker: { findUnique: jest.fn(async () => null) },
  };
  const jwt = { sign: jest.fn(() => 'jwt') };
  const config = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'TELEGRAM_BOT_TOKEN' ? TOKEN : fallback,
    ),
    getOrThrow: jest.fn(() => 'secret'),
  };
  return new AuthService(
    prisma as never,
    jwt as never,
    config as never,
    {} as never,
  );
}

describe('AuthService.loginTelegram', () => {
  it('signs in the account linked to the Telegram user', async () => {
    const result = await setup().loginTelegram(signed(42).toString());
    expect(result.user).toMatchObject({ id: 's1', kind: 'STAFF' });
    expect(result.accessToken).toBe('jwt');
  });

  it('refuses data signed with another bot token', async () => {
    await expect(
      setup().loginTelegram(signed(42, '999:other').toString()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses data changed after signing', async () => {
    const params = signed(43);
    params.set('user', JSON.stringify({ id: 42, first_name: 'Test' }));
    await expect(setup().loginTelegram(params.toString())).rejects.toThrow(
      "Telegram ma'lumotlari tasdiqlanmadi",
    );
  });

  it('refuses launch data older than a day', async () => {
    const old = signed(42, TOKEN, Date.now() / 1000 - 2 * 24 * 60 * 60);
    await expect(setup().loginTelegram(old.toString())).rejects.toThrow(
      /eskirgan/,
    );
  });

  it('refuses a Telegram user with no linked account', async () => {
    await expect(setup().loginTelegram(signed(7).toString())).rejects.toThrow(
      /ulanmagan/,
    );
  });
});
