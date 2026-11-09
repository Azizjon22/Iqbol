import { TelegramService } from './telegram.service';

type Sent = { method: string; body: Record<string, unknown> };

function setup(opts: { token?: string } = {}) {
  const staff = {
    id: 'staff1',
    fullName: 'Bosh Admin',
    role: 'SUPER_ADMIN',
    language: 'uz',
    isActive: true,
    telegramChatId: null as string | null,
    telegramLinkedAt: null as Date | null,
  };
  const zavzal = {
    id: 'staff2',
    fullName: 'Zavzal',
    role: 'ZAVZAL',
    language: 'uz',
    isActive: true,
    telegramChatId: '77' as string | null,
  };
  const event = {
    id: 'ev1',
    clientName: 'Karimovlar',
    eventDate: new Date('2026-11-05T13:00:00Z'),
    guestCount: 300,
    totalPrice: 45_000_000,
    payments: [{ amount: 45_000_000, type: 'PAYMENT' }],
    status: 'COMPLETED',
    archivedNotifiedAt: null as Date | null,
  };
  const prisma = {
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    staffUser: {
      findUnique: jest.fn(async () => staff),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { id?: string; telegramChatId?: string };
        }) => {
          if (where.id === staff.id) return staff;
          if (
            where.telegramChatId &&
            where.telegramChatId === staff.telegramChatId
          )
            return staff;
          if (where.telegramChatId === zavzal.telegramChatId) return zavzal;
          return null;
        },
      ),
      findMany: jest.fn(async () =>
        staff.telegramChatId
          ? [{ telegramChatId: staff.telegramChatId, language: staff.language }]
          : [],
      ),
      update: jest.fn(async ({ data }: { data: Partial<typeof staff> }) =>
        Object.assign(staff, data),
      ),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    worker: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    event: {
      findMany: jest.fn(
        async ({ where }: { where: { archivedNotifiedAt?: null } }) =>
          where.archivedNotifiedAt === null && event.archivedNotifiedAt
            ? []
            : [event],
      ),
      update: jest.fn(
        async ({ data }: { data: { archivedNotifiedAt: Date } }) =>
          Object.assign(event, data),
      ),
    },
    eventExpense: {
      groupBy: jest.fn(async () => [
        { eventId: 'ev1', _sum: { amount: 18_300_000 } },
      ]),
    },
  };
  const auditLog = { record: jest.fn() };
  const config = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'TELEGRAM_BOT_TOKEN' ? (opts.token ?? '1:abc') : fallback,
    ),
  };
  const service = new TelegramService(
    prisma as never,
    {} as never,
    {} as never,
    auditLog as never,
    config as never,
  );
  const sent: Sent[] = [];
  let nextId = 1;
  jest
    .spyOn(service as never as { call: () => unknown }, 'call')
    .mockImplementation((async (
      method: string,
      body: Record<string, unknown>,
    ) => {
      sent.push({ method, body });
      if (method === 'getMe') return { username: 'iqbol_bot' };
      return { message_id: nextId++ };
    }) as never);
  const onMessage = (chatId: number, text: string) =>
    (
      service as never as { onMessage: (m: unknown) => Promise<void> }
    ).onMessage({
      message_id: 1,
      chat: { id: chatId, type: 'private' },
      text,
    });
  const texts = () =>
    sent
      .filter((s) => s.method === 'sendMessage')
      .map((s) => String(s.body.text));
  return { service, prisma, staff, event, auditLog, sent, texts, onMessage };
}

const user = { sub: 'staff1', kind: 'STAFF', fullName: 'Bosh Admin' } as never;

describe('TelegramService', () => {
  it('links through a profile token exactly once', async () => {
    const t = setup();
    jest.spyOn(t.service, 'backfillArchive').mockResolvedValue();
    const { url } = await t.service.createLink(user);
    expect(url).toMatch(
      /^https:\/\/t\.me\/iqbol_bot\?start=[A-Za-z0-9_-]{32}$/,
    );
    const token = url.split('start=')[1];

    await t.onMessage(42, `/start ${token}`);
    expect(t.staff.telegramChatId).toBe('42');
    expect(t.staff.telegramLinkedAt).toBeInstanceOf(Date);
    expect(
      t.texts().some((x) => x.startsWith('✅ Bosh Admin, bot ulandi')),
    ).toBe(true);
    expect(t.auditLog.record).toHaveBeenCalled();
    // The chat gets its own command list.
    const scoped = t.sent.find(
      (s) =>
        s.method === 'setMyCommands' &&
        (s.body.scope as { chat_id?: number })?.chat_id === 42,
    );
    expect(
      (scoped!.body.commands as { command: string }[]).map((c) => c.command),
    ).toEqual([
      'toylar',
      'tekshir',
      'ombor',
      'hisobot',
      'arxiv',
      'toy',
      'chiqish',
    ]);

    await t.onMessage(43, `/start ${token}`);
    expect(t.texts().at(-1)).toMatch(/eskirgan yoki allaqachon ishlatilgan/);
    expect(t.staff.telegramChatId).toBe('42');
  });

  it('keeps money commands from other roles', async () => {
    const t = setup();
    await t.onMessage(77, '/hisobot');
    expect(t.texts().at(-1)).toBe('Hisobotlar faqat super admin uchun.');
    await t.onMessage(77, '/ombor');
    expect(t.texts().at(-1)).toBe("Ombor ma'lumotlari sizga ochiq emas.");
  });

  it('asks an unlinked chat to link first', async () => {
    const t = setup();
    await t.onMessage(99, '/toylar');
    expect(t.texts().at(-1)).toBe('Avval botni hisobingizga ulang: /start');
  });

  it('posts a completed wedding once, only when it reached someone', async () => {
    const t = setup();
    expect(await t.service.reportEventCompleted('ev1')).toBe(false);
    expect(t.event.archivedNotifiedAt).toBeNull();

    t.staff.telegramChatId = '42';
    expect(await t.service.reportEventCompleted('ev1')).toBe(true);
    const text = t.texts().at(-1)!.replace(/\s/gu, ' ');
    expect(text).toContain("🧾 Yakunlangan to'y — Karimovlar");
    expect(text).toContain("Xarajatlar: 18 300 000 so'm");
    expect(text).toContain("Qolgan (foyda): 26 700 000 so'm");
    expect(text).not.toContain('Qarzdorlik');
    expect(t.event.archivedNotifiedAt).toBeInstanceOf(Date);

    expect(await t.service.reportEventCompleted('ev1')).toBe(false);
  });

  it('does nothing without a bot token', async () => {
    const t = setup({ token: '' });
    expect(await t.service.reportEventCompleted('ev1')).toBe(false);
    await expect(t.service.createLink(user)).rejects.toThrow(
      'Telegram bot sozlanmagan',
    );
    expect(t.sent).toHaveLength(0);
  });
});

describe('TelegramService in Russian', () => {
  it('writes to each person in their own language', async () => {
    const t = setup();
    t.staff.language = 'ru';
    t.staff.telegramChatId = '42';
    await t.onMessage(42, '/hisobot');
    expect(t.texts().at(-1)).toBe('📊 Отчёт — за какой период нужен PDF?');

    expect(await t.service.reportEventCompleted('ev1')).toBe(true);
    const text = t.texts().at(-1)!;
    expect(text).toContain('🧾 Завершённая свадьба — Karimovlar');
    expect(text).toContain('гостей: 300');
    expect(text).toContain('Расходы: 18 300 000 сум');
  });

  it('answers an unlinked Russian Telegram user in Russian', async () => {
    const t = setup();
    await (
      t.service as never as { onMessage: (m: unknown) => Promise<void> }
    ).onMessage({
      message_id: 1,
      chat: { id: 99, type: 'private' },
      from: { language_code: 'ru' },
      text: '/toylar',
    });
    expect(t.texts().at(-1)).toBe('Сначала подключите бота к аккаунту: /start');
  });
});
