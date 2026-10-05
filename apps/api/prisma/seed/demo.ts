import * as bcrypt from 'bcrypt';
import type { Menu, Worker } from '@prisma/client';
import { prisma } from './client';
import {
  DEMO_PIN,
  DEMO_WORKERS,
  DEMO_WORKER_PHOTO,
  demoEvents,
  type DemoEventSeed,
} from './data/demo';
import { daysAgo } from './dates';
import type { DemoStaff } from './staff';

/** The wedding whose presence means the demo weddings were already created. */
const DEMO_MARKER = 'Demo: Karimovlar oilasi';
const TOMORROW_EVENT = "Demo: Ertangi to'y — Saidovlar";

async function seedDemoWorkers(staff: DemoStaff): Promise<Worker[]> {
  const pinHash = await bcrypt.hash(DEMO_PIN, 10);
  const workers: Worker[] = [];
  for (const def of DEMO_WORKERS) {
    const approvedById = def.status === 'APPROVED' ? staff.superAdmin.id : null;
    workers.push(
      await prisma.worker.upsert({
        where: { phone: def.phone },
        create: {
          fullName: def.fullName,
          phone: def.phone,
          position: def.position,
          status: def.status,
          pinHash: def.withPin ? pinHash : null,
          approvedById,
          photoUrl: DEMO_WORKER_PHOTO,
        },
        update: {
          status: def.status,
          pinHash: def.withPin ? pinHash : undefined,
          approvedById,
        },
      }),
    );
  }
  console.log(`${workers.length} ta ishchi. Oshpaz PIN: ${DEMO_PIN}`);
  return workers;
}

/** One wedding with its crew, payments and expenses. */
async function createDemoEvent(
  spec: DemoEventSeed,
  menu: Menu,
  crew: Worker[],
  staff: DemoStaff,
) {
  const event = await prisma.event.create({
    data: {
      clientName: spec.clientName,
      clientPhone: spec.clientPhone,
      eventDate: spec.eventDate,
      guestCount: spec.guestCount,
      tableCapacity: spec.tableCapacity,
      menuId: menu.id,
      totalPrice: Number(menu.pricePerPerson) * spec.guestCount,
      status: spec.status,
      notes: spec.notes,
      createdById: staff.admin.id,
    },
  });

  // A cancelled wedding has nobody assigned to it.
  for (const worker of spec.status === 'CANCELLED' ? [] : crew) {
    await prisma.eventWorkerAssignment.create({
      data: {
        eventId: event.id,
        workerId: worker.id,
        assignedById: staff.zavzal.id,
        roleAtEvent: worker.position === 'CHEF' ? 'Oshpaz' : 'Afitsant',
      },
    });
  }

  for (const payment of spec.payments ?? []) {
    const paymentDate = new Date(spec.eventDate);
    paymentDate.setDate(paymentDate.getDate() + payment.daysOffset);
    await prisma.payment.create({
      data: {
        eventId: event.id,
        amount: payment.amount,
        paymentDate,
        method: payment.method,
        createdById: staff.admin.id,
        note: "Demo to'lov",
      },
    });
  }

  for (const expense of spec.expenses ?? []) {
    await prisma.eventExpense.create({
      data: {
        eventId: event.id,
        category: expense.category,
        amount: expense.amount,
        note: expense.note,
        createdById: staff.admin.id,
      },
    });
  }
}

/** A list waiting for review on tomorrow's wedding, and a bought one on a past wedding. */
async function seedDemoShoppingLists(
  chef: Worker | undefined,
  staff: DemoStaff,
) {
  const tomorrowEvent = await prisma.event.findFirst({
    where: { clientName: TOMORROW_EVENT },
  });
  if (!chef || !tomorrowEvent) return;

  const existingList = await prisma.shoppingList.findFirst({
    where: { eventId: tomorrowEvent.id, createdByWorkerId: chef.id },
  });
  if (!existingList) {
    await prisma.shoppingList.create({
      data: {
        eventId: tomorrowEvent.id,
        createdByWorkerId: chef.id,
        status: 'SUBMITTED',
        items: {
          create: [
            { name: 'Pomidor', quantity: 15, unit: 'KG' },
            { name: 'Bodring', quantity: 10, unit: 'KG' },
            { name: "Mol go'shti", quantity: 25, unit: 'KG' },
            { name: 'Guruch', quantity: 30, unit: 'KG' },
            { name: "O'simlik yog'i", quantity: 8, unit: 'LITER' },
          ],
        },
      },
    });
  }

  const pastEvent = await prisma.event.findFirst({
    where: { clientName: DEMO_MARKER },
  });
  if (pastEvent) {
    await prisma.shoppingList.create({
      data: {
        eventId: pastEvent.id,
        createdByWorkerId: chef.id,
        status: 'PURCHASED',
        reviewedById: staff.admin.id,
        reviewedAt: daysAgo(46),
        items: {
          create: [
            {
              name: 'Kartoshka',
              quantity: 40,
              unit: 'KG',
              unitPrice: 4000,
              isPurchased: true,
            },
            {
              name: 'Piyoz',
              quantity: 20,
              unit: 'KG',
              unitPrice: 3000,
              isPurchased: true,
            },
            {
              name: "Qo'y go'shti",
              quantity: 35,
              unit: 'KG',
              unitPrice: 95000,
              isPurchased: true,
            },
          ],
        },
      },
    });
  }
  console.log("Bozorlik ro'yxatlari yaratildi.");
}

/**
 * Development only: workers, weddings with payments and expenses, and two
 * shopping lists. Workers are refreshed on every run; the weddings are
 * created once.
 */
export async function seedDemo(staff: DemoStaff, menus: Menu[]) {
  const workers = await seedDemoWorkers(staff);

  if (await prisma.event.findFirst({ where: { clientName: DEMO_MARKER } })) {
    console.log("Demo to'ylar allaqachon mavjud — qayta yaratilmadi.");
    return;
  }

  const approved = workers.filter((worker) => worker.status === 'APPROVED');
  const waiters = approved.filter((worker) => worker.position !== 'CHEF');
  const chefs = approved.filter((worker) => worker.position === 'CHEF');
  const crew = [...waiters.slice(0, 4), ...chefs.slice(0, 1)];

  const events = demoEvents();
  for (const spec of events) {
    await createDemoEvent(spec, menus[spec.menuIndex]!, crew, staff);
  }
  console.log(`${events.length} ta demo to'y + to'lov/xarajat yaratildi.`);

  await seedDemoShoppingLists(chefs[0], staff);
}
