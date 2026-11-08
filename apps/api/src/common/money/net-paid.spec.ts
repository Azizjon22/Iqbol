import { Prisma } from '@prisma/client';
import { netPaid } from './net-paid';

const d = (n: string) => new Prisma.Decimal(n);

describe('netPaid', () => {
  it('is zero when nothing was paid', () => {
    expect(netPaid([]).toString()).toBe('0');
  });

  it('adds payments and subtracts refunds', () => {
    const total = netPaid([
      { amount: d('10000000'), type: 'PAYMENT' },
      { amount: d('4000000.55'), type: 'PAYMENT' },
      { amount: d('100'), type: 'REFUND' },
    ]);
    expect(total.toString()).toBe('13999900.55');
  });

  it('keeps tiyin exact where floating point would drift', () => {
    const total = netPaid([
      { amount: d('0.1'), type: 'PAYMENT' },
      { amount: d('0.2'), type: 'PAYMENT' },
    ]);
    expect(total.toString()).toBe('0.3');
  });
});
