import { PaymentType, Prisma } from '@prisma/client';

/** Money actually kept from an event: payments in, minus refunds handed back. */
export function netPaid(
  payments: { amount: Prisma.Decimal; type: PaymentType }[],
) {
  return payments.reduce(
    (sum, p) => (p.type === 'REFUND' ? sum.sub(p.amount) : sum.add(p.amount)),
    new Prisma.Decimal(0),
  );
}
