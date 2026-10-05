import * as bcrypt from 'bcrypt';
import { prisma } from './client';

/**
 * Production: one super admin and nothing else — no demo accounts with known
 * passwords. The password comes from the environment and must be replaced at
 * first login.
 */
export async function seedProductionAdmin() {
  const phone = process.env.SEED_SUPER_ADMIN_PHONE;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!phone || !password || password.length < 8) {
    throw new Error(
      'Productionda SEED_SUPER_ADMIN_PHONE va kamida 8 belgili SEED_SUPER_ADMIN_PASSWORD berilishi shart',
    );
  }
  const existing = await prisma.staffUser.findUnique({ where: { phone } });
  if (existing) {
    console.log(`Super admin allaqachon mavjud: ${phone}`);
    return;
  }
  await prisma.staffUser.create({
    data: {
      fullName: 'Bosh Administrator',
      phone,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'SUPER_ADMIN',
      mustChangePassword: true,
    },
  });
  console.log(
    `Super admin yaratildi: ${phone}. Birinchi kirishda parolni almashtirish so'raladi.`,
  );
}

const DEMO_ADMIN = { phone: '+998901111111', password: 'Admin2024!' };
const DEMO_ZAVZAL = { phone: '+998902222222', password: 'Zavzal2024!' };

/** Development only: three staff accounts with well-known passwords. */
export async function seedDemoStaff() {
  const superAdminPhone = process.env.SEED_SUPER_ADMIN_PHONE ?? '+998900000000';
  const superAdminPassword =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Iqbol2024!';

  const superAdmin = await prisma.staffUser.upsert({
    where: { phone: superAdminPhone },
    create: {
      fullName: 'Bosh Administrator',
      phone: superAdminPhone,
      passwordHash: await bcrypt.hash(superAdminPassword, 10),
      role: 'SUPER_ADMIN',
    },
    update: {},
  });
  console.log(`Super admin: ${superAdminPhone} / ${superAdminPassword}`);

  const admin = await prisma.staffUser.upsert({
    where: { phone: DEMO_ADMIN.phone },
    create: {
      fullName: 'Dilnoza Karimova',
      phone: DEMO_ADMIN.phone,
      passwordHash: await bcrypt.hash(DEMO_ADMIN.password, 10),
      role: 'ADMIN',
    },
    update: {},
  });
  console.log(`Admin: ${DEMO_ADMIN.phone} / ${DEMO_ADMIN.password}`);

  const zavzal = await prisma.staffUser.upsert({
    where: { phone: DEMO_ZAVZAL.phone },
    create: {
      fullName: 'Jasur Toshmatov',
      phone: DEMO_ZAVZAL.phone,
      passwordHash: await bcrypt.hash(DEMO_ZAVZAL.password, 10),
      role: 'ZAVZAL',
    },
    update: {},
  });
  console.log(`Zavzal: ${DEMO_ZAVZAL.phone} / ${DEMO_ZAVZAL.password}`);

  return {
    superAdmin,
    admin,
    zavzal,
    /** Printed at the end of a development seed. */
    logins: [
      `SUPER_ADMIN  ${superAdminPhone} / ${superAdminPassword}`,
      `ADMIN        ${DEMO_ADMIN.phone} / ${DEMO_ADMIN.password}`,
      `ZAVZAL       ${DEMO_ZAVZAL.phone} / ${DEMO_ZAVZAL.password}`,
    ],
  };
}

export type DemoStaff = Awaited<ReturnType<typeof seedDemoStaff>>;
