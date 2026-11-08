import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventsService } from './events.service';

const d = (n: number) => new Prisma.Decimal(n);
const DAY = 24 * 60 * 60 * 1000;

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    menu: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'm1', pricePerPerson: d(80_000) }),
    },
    payment: { findMany: jest.fn().mockResolvedValue([]) },
    event: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'e1', ...data }),
        ),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'e1', totalPrice: d(24_000_000), ...data }),
        ),
      delete: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
  return {
    prisma,
    service: new EventsService(prisma as never, auditLog as never),
  };
}

const booking = (eventDate: Date) => ({
  clientName: 'Test',
  clientPhone: '+998901234567',
  eventDate: eventDate.toISOString(),
  tableCapacity: 10,
  guestCount: 300,
  menuId: 'm1',
});

describe('EventsService', () => {
  it('prices a wedding at the per-person price times the guest count', async () => {
    const { service } = setup();
    const event = await service.create(
      booking(new Date(Date.now() + 30 * DAY)),
      'u1',
      'Admin',
    );
    expect(event.totalPrice.toString()).toBe('24000000');
  });

  it('refuses a booking dated before today', async () => {
    const { service, prisma } = setup();
    await expect(
      service.create(booking(new Date(Date.now() - 3 * DAY)), 'u1', 'Admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('refuses a second wedding on the same date and time', async () => {
    const { service, prisma } = setup();
    prisma.event.findFirst.mockResolvedValue({ clientName: 'Boshqa' });
    await expect(
      service.create(booking(new Date(Date.now() + 30 * DAY)), 'u1', 'Admin'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['CONFIRMED', 'COMPLETED'])(
    'never deletes a %s wedding',
    async (status) => {
      const { service, prisma } = setup();
      prisma.event.findUnique.mockResolvedValue({
        id: 'e1',
        clientName: 'T',
        status,
        _count: { payments: 0, expenses: 0, stockUsages: 0 },
      });
      await expect(service.remove('e1', 'u1', 'Admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    },
  );

  it('never deletes a wedding that has money recorded on it', async () => {
    const { service, prisma } = setup();
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      clientName: 'T',
      status: 'PENDING',
      _count: { payments: 1, expenses: 0, stockUsages: 0 },
    });
    await expect(service.remove('e1', 'u1', 'Admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it('deletes a pending wedding with no money on it', async () => {
    const { service, prisma } = setup();
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      clientName: 'T',
      status: 'PENDING',
      _count: { payments: 0, expenses: 0, stockUsages: 0 },
    });
    await service.remove('e1', 'u1', 'Admin');
    expect(prisma.event.delete).toHaveBeenCalled();
  });

  it('will not mark a future wedding as completed', async () => {
    const { service, prisma } = setup();
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      clientName: 'T',
      status: 'CONFIRMED',
      eventDate: new Date(Date.now() + 5 * DAY),
    });
    await expect(
      service.updateStatus('e1', 'COMPLETED', 'u1', 'Admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('will not switch to a package cheaper than what was already paid', async () => {
    const { service, prisma } = setup();
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      clientName: 'T',
      status: 'PENDING',
      menuId: 'old',
      guestCount: 300,
      totalPrice: d(46_000_000),
      eventDate: new Date(Date.now() + 5 * DAY),
    });
    prisma.payment.findMany.mockResolvedValue([
      { amount: d(30_000_000), type: 'PAYMENT' },
    ]);
    await expect(
      service.update('e1', { menuId: 'm1' }, 'u1', 'Admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});
