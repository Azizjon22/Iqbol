import { Prisma } from '@prisma/client';
import { EventsService } from './events.service';

const money = (n: number) => new Prisma.Decimal(n);

function setup(
  existing?: Record<string, unknown>,
  payments: { amount: Prisma.Decimal; type: 'PAYMENT' | 'REFUND' }[] = [],
) {
  const menus: Record<string, { id: string; pricePerPerson: Prisma.Decimal }> =
    {
      standard: { id: 'standard', pricePerPerson: money(300_000) },
      vip: { id: 'vip', pricePerPerson: money(370_000) },
    };
  const saved: { data?: Record<string, unknown> } = {};
  const write = jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
    saved.data = data;
    return {
      id: 'event-1',
      clientName: 'Test',
      payments: [],
      ...existing,
      ...data,
    };
  });
  const prisma: Record<string, unknown> = {
    $queryRaw: jest.fn(async () => []),
    $transaction: jest.fn(
      async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> =>
        run(prisma),
    ),
    menu: {
      findUnique: jest.fn(
        async ({ where }: { where: { id: string } }) => menus[where.id] ?? null,
      ),
    },
    payment: { findMany: jest.fn(async () => payments) },
    event: {
      create: write,
      update: write,
      delete: jest.fn(async () => existing),
      findUnique: jest.fn(async () =>
        existing
          ? {
              ...existing,
              _count: { payments: payments.length, expenses: 0 },
            }
          : null,
      ),
    },
  };
  const service = new EventsService(
    prisma as never,
    { record: jest.fn() } as never,
  );
  return { service, saved, menus };
}

const baseDto = {
  clientName: 'Karimovlar',
  clientPhone: '+998901234567',
  eventDate: '2026-12-01T13:00:00.000Z',
  tableCapacity: 10,
};

describe('EventsService pricing', () => {
  it("prices a new wedding as the menu's per-guest price times the guests", async () => {
    const { service, saved } = setup();
    await service.create(
      { ...baseDto, guestCount: 200, menuId: 'standard' } as never,
      'actor',
      'Actor',
    );
    expect(String(saved.data!.totalPrice)).toBe('60000000');
  });

  it('rejects a wedding for a menu that does not exist', async () => {
    const { service } = setup();
    await expect(
      service.create(
        { ...baseDto, guestCount: 100, menuId: 'missing' } as never,
        'actor',
        'Actor',
      ),
    ).rejects.toThrow('Menyu topilmadi');
  });

  const booked = {
    id: 'event-1',
    clientName: 'Karimovlar',
    menuId: 'standard',
    guestCount: 200,
    // Booked back when the menu cost 250 000 per guest.
    totalPrice: money(50_000_000),
    firstDish: null,
    secondDish: null,
    status: 'CONFIRMED',
    payments: [],
  };

  it('keeps the agreed per-guest rate when only the guest count changes', async () => {
    const { service, saved } = setup(booked);
    await service.update('event-1', { guestCount: 220 } as never, 'a', 'A');
    expect(String(saved.data!.totalPrice)).toBe('55000000');
  });

  it('re-prices from the new menu when the menu is switched', async () => {
    const { service, saved } = setup(booked);
    await service.update('event-1', { menuId: 'vip' } as never, 'a', 'A');
    expect(String(saved.data!.totalPrice)).toBe('74000000');
  });

  it('refuses a new price below what the client has already paid', async () => {
    const paid = [{ amount: money(40_000_000), type: 'PAYMENT' as const }];
    const { service } = setup(booked, paid);
    // 100 guests × 250 000 = 25 000 000 < 40 000 000 paid
    await expect(
      service.update('event-1', { guestCount: 100 } as never, 'a', 'A'),
    ).rejects.toThrow(/allaqachon to'langan summadan/);
  });

  it('counts refunds when checking the new price against money paid', async () => {
    const paid = [
      { amount: money(40_000_000), type: 'PAYMENT' as const },
      { amount: money(20_000_000), type: 'REFUND' as const },
    ];
    const { service, saved } = setup(booked, paid);
    await service.update('event-1', { guestCount: 100 } as never, 'a', 'A');
    expect(String(saved.data!.totalPrice)).toBe('25000000');
  });

  it('will not delete a wedding that has payments on it', async () => {
    const paid = [{ amount: money(1_000_000), type: 'PAYMENT' as const }];
    const { service } = setup({ ...booked, status: 'PENDING' }, paid);
    await expect(service.remove('event-1', 'a', 'A')).rejects.toThrow(
      /to'lov yoki xarajat yozilgan/,
    );
  });

  it('will not delete a confirmed wedding even without payments', async () => {
    const { service } = setup(booked);
    await expect(service.remove('event-1', 'a', 'A')).rejects.toThrow(
      /Tasdiqlangan yoki yakunlangan/,
    );
  });

  it('deletes a pending wedding with no money on it', async () => {
    const { service } = setup({ ...booked, status: 'PENDING' });
    await expect(service.remove('event-1', 'a', 'A')).resolves.toEqual({
      success: true,
    });
  });

  it('leaves the price alone when neither menu nor guests change', async () => {
    const { service, saved } = setup(booked);
    await service.update('event-1', { notes: 'x' } as never, 'a', 'A');
    expect(String(saved.data!.totalPrice)).toBe('50000000');
  });
});
