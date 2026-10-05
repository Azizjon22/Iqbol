import { prisma } from './seed/client';
import { DEMO_PIN, DEMO_WORKERS } from './seed/data/demo';
import { seedDemo } from './seed/demo';
import { seedInventory } from './seed/inventory';
import { seedMenus } from './seed/menus';
import { seedDemoStaff, seedProductionAdmin } from './seed/staff';

/**
 * `prisma db seed`.
 *
 * Production (NODE_ENV=production): the super admin from the environment,
 * plus the hall's menus, dishware and product catalog — written once, never
 * overwritten. No demo people, no demo weddings.
 *
 * Development: the same hall data kept in step with this seed, and demo
 * staff, workers and weddings so every screen has something to show.
 */
async function main() {
  const production = process.env.NODE_ENV === 'production';

  if (production) await seedProductionAdmin();
  const menus = await seedMenus({ production });
  await seedInventory({ production });

  if (production) {
    console.log(
      "Production seed tugadi: demo xodimlar, ishchilar va to'ylar yaratilmadi.",
    );
    return;
  }

  const staff = await seedDemoStaff();
  await seedDemo(staff, menus);

  const demoChef = DEMO_WORKERS.find((worker) => worker.withPin);
  console.log('\n--- Demo login ---');
  for (const login of staff.logins) console.log(login);
  console.log(`OSHPAZ       ${demoChef?.phone} / PIN ${DEMO_PIN}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
