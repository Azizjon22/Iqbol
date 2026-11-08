import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

const d = (n: number | string) => new Prisma.Decimal(n);

/** A wedding in memory, behind just enough of Prisma for the service. */
function setup(event: {
  totalPrice: number;
  status?: string;
  payments?: { amount: number; type: 'PAYMENT' | 'REFUND' }[];
}) {
  const state = {
    id: 'e1',
    clientName: 'Test',
    status: event.status ?? 'PENDING',
    totalPrice: d(event.totalPrice),
    payments: (event.payments ?? []).map((p) => ({
      ...p,
      amount: d(p.amount),
    })),
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    event: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(state)),
      update: jest.fn().mockImplementation(({ data }) => {
        Object.assign(state, data);
        return Promise.resolve(state);
      }),
    },
    payment: {
      create: jest.fn().mockImplementation(({ data }) => {
        state.payments.push({
          amount: data.amount,
          type: data.type ?? 'PAYMENT',
        });
        return Promise.resolve({ id: 'p1', ...data });
      }),
    },
  };
  const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new PaymentsService(prisma as never, auditLog as never);
  return { service, state, tx, auditLog };
}

const cash = (amount: number) => ({ amount, method: 'CASH' as const });

describe('PaymentsService', () => {
  it('takes a part payment and leaves the wedding pending', async () => {
    const { service, state } = setup({ totalPrice: 24_000_000 });
    await service.create('e1', cash(10_000_000), 'u1', 'Admin');
    expect(state.status).toBe('PENDING');
    expect(state.payments).toHaveLength(1);
  });

  it('confirms the wedding by itself once it is paid in full', async () => {
    const { service, state, auditLog } = setup({
      totalPrice: 24_000_000,
      payments: [{ amount: 10_000_000, type: 'PAYMENT' }],
    });
    await service.create('e1', cash(14_000_000), 'u1', 'Admin');
    expect(state.status).toBe('CONFIRMED');
    expect(auditLog.record).toHaveBeenCalledTimes(2);
  });

  it('refuses a payment larger than what is still owed', async () => {
    const { service, state } = setup({
      totalPrice: 24_000_000,
      payments: [{ amount: 20_000_000, type: 'PAYMENT' }],
    });
    await expect(
      service.create('e1', cash(4_000_000.01), 'u1', 'Admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(state.payments).toHaveLength(1);
  });

  it('refuses any payment on a cancelled wedding', async () => {
    const { service } = setup({ totalPrice: 24_000_000, status: 'CANCELLED' });
    await expect(
      service.create('e1', cash(1000), 'u1', 'Admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('locks the wedding row before checking the balance', async () => {
    const { service, tx } = setup({ totalPrice: 24_000_000 });
    await service.create('e1', cash(1000), 'u1', 'Admin');
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.event.findUnique.mock.invocationCallOrder[0],
    );
  });

  it('refunds no more than was actually kept', async () => {
    const { service, state } = setup({
      totalPrice: 24_000_000,
      payments: [
        { amount: 5_000_000, type: 'PAYMENT' },
        { amount: 1_000_000, type: 'REFUND' },
      ],
    });
    await expect(
      service.refund('e1', cash(4_000_001), 'u1', 'Admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.refund('e1', cash(4_000_000), 'u1', 'Admin');
    expect(state.payments).toHaveLength(3);
  });
});
