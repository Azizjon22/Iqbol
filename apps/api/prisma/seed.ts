import { PrismaClient, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function daysFromNow(days: number, hour = 18) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number, hour = 18) {
  return daysFromNow(-days, hour);
}

async function main() {
  const superAdminPhone = process.env.SEED_SUPER_ADMIN_PHONE ?? '+998900000000';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Iqbol2024!';

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);
  const adminHash = await bcrypt.hash('Admin2024!', 10);
  const zavzalHash = await bcrypt.hash('Zavzal2024!', 10);
  const pinHash = await bcrypt.hash('1234', 10);

  const superAdmin = await prisma.staffUser.upsert({
    where: { phone: superAdminPhone },
    create: {
      fullName: 'Bosh Administrator',
      phone: superAdminPhone,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    update: {},
  });
  console.log(`Super admin: ${superAdminPhone} / ${superAdminPassword}`);

  const admin = await prisma.staffUser.upsert({
    where: { phone: '+998901111111' },
    create: {
      fullName: 'Dilnoza Karimova',
      phone: '+998901111111',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
    update: {},
  });
  console.log('Admin: +998901111111 / Admin2024!');

  const zavzal = await prisma.staffUser.upsert({
    where: { phone: '+998902222222' },
    create: {
      fullName: 'Jasur Toshmatov',
      phone: '+998902222222',
      passwordHash: zavzalHash,
      role: 'ZAVZAL',
    },
    update: {},
  });
  console.log('Zavzal: +998902222222 / Zavzal2024!');

  const coverImages = [
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc8?w=1200&q=80',
    'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80',
  ];

  const dishPhoto = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80';
  const hallPhotos = [
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1000&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc8?w=1000&q=80',
  ];
  const tablePhotos = [
    'https://images.unsplash.com/photo-1478144592103-25e218a04893?w=1000&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80',
  ];

  const menuDefs = [
    {
      name: "160 ming menyu",
      pricePerPerson: 160000,
      description: "Standart to'y menyusi — salatlar, birinchi va ikkinchi ovqatlar, meva va ichimliklar.",
      isVip: false,
      cover: coverImages[0],
    },
    {
      name: "200 ming menyu",
      pricePerPerson: 200000,
      description: "Kengaytirilgan menyu — qo'shimcha shirinliklar va premium ichimliklar bilan.",
      isVip: false,
      cover: coverImages[1],
    },
    {
      name: "260 ming menyu",
      pricePerPerson: 260000,
      description: "Premium paket — boy dasturxon, bezatilgan stol va foto zona.",
      isVip: false,
      cover: coverImages[2],
    },
    {
      name: 'VIP menyu',
      pricePerPerson: 350000,
      description: "Eng yuqori darajadagi VIP menyu — maxsus taomlar, live cooking va to'liq servis.",
      isVip: true,
      cover: coverImages[3],
    },
  ];

  const dishTemplates: { category: Prisma.MenuDishCreateManyInput['category']; name: string; description: string }[] = [
    { category: 'SALAD', name: 'Achchiq-chuchuk', description: "Pomidor, piyoz, ko'katlar" },
    { category: 'SALAD', name: 'Olivye', description: 'Klassik olivye salati' },
    { category: 'SALAD', name: "Smuzi salat", description: "Yangi sabzavotlar aralashmasi" },
    { category: 'FIRST_DISH', name: "Lag'mon", description: "Uy qog'ozli lag'mon" },
    { category: 'FIRST_DISH', name: "Mastava", description: "An'anaviy mastava" },
    { category: 'SECOND_DISH', name: 'Osh', description: "To'y oshi" },
    { category: 'SECOND_DISH', name: "Qo'y kabob", description: "Cho'g'da pishirilgan kabob" },
    { category: 'SECOND_DISH', name: "Tovuq qovurma", description: "Ziravorli tovuq" },
    { category: 'FRUIT', name: 'Meva assorti', description: "Mavsumiy mevalar" },
    { category: 'DESSERT', name: 'Napoleon', description: 'Klassik tort' },
    { category: 'DESSERT', name: 'Chak-chak', description: "Asalli shirinlik" },
    { category: 'DRINK', name: 'Kompot', description: "Uy kompoti" },
    { category: 'DRINK', name: 'Choy / Qahva', description: "Issiq ichimliklar" },
  ];

  const menus = [];
  for (const def of menuDefs) {
    let menu = await prisma.menu.findFirst({ where: { name: def.name } });
    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          name: def.name,
          pricePerPerson: def.pricePerPerson,
          description: def.description,
          isVip: def.isVip,
          coverImageUrl: def.cover,
        },
      });
    } else {
      menu = await prisma.menu.update({
        where: { id: menu.id },
        data: {
          description: def.description,
          coverImageUrl: def.cover,
          pricePerPerson: def.pricePerPerson,
          isVip: def.isVip,
        },
      });
    }

    const dishCount = await prisma.menuDish.count({ where: { menuId: menu.id } });
    if (dishCount === 0) {
      await prisma.menuDish.createMany({
        data: dishTemplates.map((d, i) => ({
          menuId: menu!.id,
          category: d.category,
          name: d.name,
          description: d.description,
          photoUrl: dishPhoto,
          order: i,
        })),
      });
    }

    const mediaCount = await prisma.menuMedia.count({ where: { menuId: menu.id } });
    if (mediaCount === 0) {
      await prisma.menuMedia.createMany({
        data: [
          { menuId: menu.id, section: 'HALL', mediaType: 'PHOTO', url: hallPhotos[0], caption: 'Asosiy zal', order: 0 },
          { menuId: menu.id, section: 'HALL', mediaType: 'PHOTO', url: hallPhotos[1], caption: 'Zal panoramasi', order: 1 },
          { menuId: menu.id, section: 'TABLE_SETUP', mediaType: 'PHOTO', url: tablePhotos[0], caption: 'Stol bezagi', order: 0 },
          { menuId: menu.id, section: 'TABLE_SETUP', mediaType: 'PHOTO', url: tablePhotos[1], caption: 'Servirovka', order: 1 },
          {
            menuId: menu.id,
            section: 'KORTEJ',
            mediaType: 'PHOTO',
            url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&q=80',
            caption: 'Kortej',
            order: 0,
          },
          {
            menuId: menu.id,
            section: 'PHOTOGRAPHER',
            mediaType: 'PHOTO',
            url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1000&q=80',
            caption: 'Foto zona',
            order: 0,
          },
        ],
      });
    }

    menus.push(menu);
  }
  console.log(`${menus.length} ta menyu (taomlar + media) tayyor.`);

  const productCatalog: {
    name: string;
    unit: 'KG' | 'LITER' | 'DONA';
    productCategory: Prisma.InventoryItemCreateInput['productCategory'];
    quantity: number;
    minThreshold: number;
  }[] = [
    { name: 'Kartoshka', unit: 'KG', productCategory: 'VEGETABLE', quantity: 80, minThreshold: 20 },
    { name: 'Piyoz', unit: 'KG', productCategory: 'VEGETABLE', quantity: 45, minThreshold: 15 },
    { name: 'Sabzi', unit: 'KG', productCategory: 'VEGETABLE', quantity: 30, minThreshold: 10 },
    { name: 'Pomidor', unit: 'KG', productCategory: 'VEGETABLE', quantity: 8, minThreshold: 12 },
    { name: 'Bodring', unit: 'KG', productCategory: 'VEGETABLE', quantity: 5, minThreshold: 10 },
    { name: "Qalampir (bulg'or)", unit: 'KG', productCategory: 'VEGETABLE', quantity: 12, minThreshold: 5 },
    { name: 'Karam', unit: 'KG', productCategory: 'VEGETABLE', quantity: 18, minThreshold: 5 },
    { name: 'Olma', unit: 'KG', productCategory: 'FRUIT', quantity: 25, minThreshold: 8 },
    { name: 'Uzum', unit: 'KG', productCategory: 'FRUIT', quantity: 6, minThreshold: 8 },
    { name: 'Banan', unit: 'KG', productCategory: 'FRUIT', quantity: 15, minThreshold: 5 },
    { name: 'Anor', unit: 'KG', productCategory: 'FRUIT', quantity: 10, minThreshold: 4 },
    { name: 'Limon', unit: 'KG', productCategory: 'FRUIT', quantity: 4, minThreshold: 3 },
    { name: "Mol go'shti", unit: 'KG', productCategory: 'MEAT', quantity: 40, minThreshold: 15 },
    { name: "Qo'y go'shti", unit: 'KG', productCategory: 'MEAT', quantity: 22, minThreshold: 10 },
    { name: "Tovuq go'shti", unit: 'KG', productCategory: 'MEAT', quantity: 35, minThreshold: 12 },
    { name: 'Qiyma', unit: 'KG', productCategory: 'MEAT', quantity: 14, minThreshold: 8 },
    { name: 'Sut', unit: 'LITER', productCategory: 'DAIRY', quantity: 20, minThreshold: 10 },
    { name: 'Qatiq', unit: 'LITER', productCategory: 'DAIRY', quantity: 12, minThreshold: 8 },
    { name: 'Tvorog', unit: 'KG', productCategory: 'DAIRY', quantity: 7, minThreshold: 5 },
    { name: "Sariyog'", unit: 'KG', productCategory: 'DAIRY', quantity: 5, minThreshold: 3 },
    { name: 'Ukrop', unit: 'DONA', productCategory: 'GREENS', quantity: 30, minThreshold: 10 },
    { name: 'Jambil', unit: 'DONA', productCategory: 'GREENS', quantity: 20, minThreshold: 8 },
    { name: 'Rayhon', unit: 'DONA', productCategory: 'GREENS', quantity: 15, minThreshold: 8 },
    { name: 'Petrushka', unit: 'DONA', productCategory: 'GREENS', quantity: 18, minThreshold: 8 },
    { name: 'Guruch', unit: 'KG', productCategory: 'GRAIN', quantity: 100, minThreshold: 30 },
    { name: 'Un', unit: 'KG', productCategory: 'GRAIN', quantity: 50, minThreshold: 20 },
    { name: 'Makaron', unit: 'KG', productCategory: 'GRAIN', quantity: 20, minThreshold: 8 },
    { name: "O'simlik yog'i", unit: 'LITER', productCategory: 'OIL', quantity: 25, minThreshold: 10 },
    { name: 'Tuz', unit: 'KG', productCategory: 'SPICE', quantity: 15, minThreshold: 5 },
    { name: 'Qora murch', unit: 'KG', productCategory: 'SPICE', quantity: 2, minThreshold: 1 },
    { name: 'Zira', unit: 'KG', productCategory: 'SPICE', quantity: 1.5, minThreshold: 0.5 },
  ];

  for (const item of productCatalog) {
    await prisma.inventoryItem.upsert({
      where: { name: item.name },
      create: {
        name: item.name,
        unit: item.unit,
        category: 'PRODUCT',
        productCategory: item.productCategory,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
      },
      update: {
        productCategory: item.productCategory,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
      },
    });
  }

  const dishware = [
    { name: 'Katta likopcha', quantity: 240, minThreshold: 100 },
    { name: 'Kichik likopcha', quantity: 280, minThreshold: 120 },
    { name: 'Stakan', quantity: 300, minThreshold: 150 },
    { name: 'Choynak', quantity: 40, minThreshold: 20 },
    { name: 'Vilka-pichoq set', quantity: 250, minThreshold: 100 },
  ];
  for (const item of dishware) {
    await prisma.inventoryItem.upsert({
      where: { name: item.name },
      create: {
        name: item.name,
        unit: 'DONA',
        category: 'DISHWARE',
        quantity: item.quantity,
        minThreshold: item.minThreshold,
      },
      update: {
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        category: 'DISHWARE',
      },
    });
  }
  console.log('Ombor (mahsulot + idish) to\'ldirildi.');

  const workerDefs: {
    fullName: string;
    phone: string;
    position: Prisma.WorkerCreateInput['position'];
    status: Prisma.WorkerCreateInput['status'];
    withPin?: boolean;
  }[] = [
    { fullName: 'Aziz Rahimov', phone: '+998903010101', position: 'WAITER_MALE', status: 'APPROVED' },
    { fullName: 'Sardor Aliyev', phone: '+998903010102', position: 'WAITER_MALE', status: 'APPROVED' },
    { fullName: 'Bekzod Yusupov', phone: '+998903010103', position: 'WAITER_MALE', status: 'APPROVED' },
    { fullName: 'Madina Nazarova', phone: '+998903020201', position: 'WAITER_FEMALE', status: 'APPROVED' },
    { fullName: 'Nilufar Saidova', phone: '+998903020202', position: 'WAITER_FEMALE', status: 'APPROVED' },
    { fullName: 'Dilshoda Ergasheva', phone: '+998903020203', position: 'WAITER_FEMALE', status: 'PENDING' },
    { fullName: 'Olim Chef', phone: '+998903030301', position: 'CHEF', status: 'APPROVED', withPin: true },
    { fullName: 'Karim Oshpaz', phone: '+998903030302', position: 'CHEF', status: 'APPROVED', withPin: true },
    { fullName: 'Shoxrux Yangi', phone: '+998903040401', position: 'OTHER', status: 'PENDING' },
  ];

  const workers = [];
  for (const w of workerDefs) {
    const worker = await prisma.worker.upsert({
      where: { phone: w.phone },
      create: {
        fullName: w.fullName,
        phone: w.phone,
        position: w.position,
        status: w.status,
        pinHash: w.withPin ? pinHash : null,
        approvedById: w.status === 'APPROVED' ? superAdmin.id : null,
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      },
      update: {
        status: w.status,
        pinHash: w.withPin ? pinHash : undefined,
        approvedById: w.status === 'APPROVED' ? superAdmin.id : null,
      },
    });
    workers.push(worker);
  }
  console.log(`${workers.length} ta ishchi. Oshpaz PIN: 1234`);

  const demoMarker = await prisma.event.findFirst({
    where: { clientName: 'Demo: Karimovlar oilasi' },
  });

  if (demoMarker) {
    console.log('Demo to\'ylar allaqachon mavjud — qayta yaratilmadi.');
  } else {
    const approvedWaiters = workers.filter((w) => w.status === 'APPROVED' && w.position !== 'CHEF');
    const chefs = workers.filter((w) => w.position === 'CHEF' && w.status === 'APPROVED');

    const eventSpecs: {
      clientName: string;
      clientPhone: string;
      eventDate: Date;
      guestCount: number;
      tableCapacity: number;
      menuIndex: number;
      status: Prisma.EventCreateInput['status'];
      notes?: string;
      payments?: { amount: number; daysOffset: number; method: 'CASH' | 'CARD' | 'TRANSFER' }[];
      expenses?: { category: Prisma.EventExpenseCreateInput['category']; amount: number; note?: string }[];
    }[] = [
      {
        clientName: 'Demo: Karimovlar oilasi',
        clientPhone: '+998907001001',
        eventDate: daysAgo(45),
        guestCount: 200,
        tableCapacity: 10,
        menuIndex: 1,
        status: 'COMPLETED',
        notes: 'Klassik to\'y, kechki dasturxon',
        payments: [
          { amount: 15000000, daysOffset: -60, method: 'TRANSFER' },
          { amount: 25000000, daysOffset: -10, method: 'CASH' },
        ],
        expenses: [
          { category: 'SHOPPING', amount: 8500000, note: 'Bozorlik' },
          { category: 'CHEF', amount: 3000000 },
          { category: 'WAITERS', amount: 2500000 },
          { category: 'CAMERAMAN', amount: 4000000 },
          { category: 'ZAVZAL', amount: 1500000 },
        ],
      },
      {
        clientName: 'Demo: Rahimovlar to\'yi',
        clientPhone: '+998907001002',
        eventDate: daysAgo(28),
        guestCount: 280,
        tableCapacity: 12,
        menuIndex: 2,
        status: 'COMPLETED',
        payments: [
          { amount: 20000000, daysOffset: -40, method: 'CARD' },
          { amount: 40000000, daysOffset: -5, method: 'TRANSFER' },
        ],
        expenses: [
          { category: 'SHOPPING', amount: 12000000 },
          { category: 'ARTIST', amount: 8000000 },
          { category: 'KORTEJ', amount: 5000000 },
          { category: 'CHEF', amount: 4000000 },
          { category: 'WAITERS', amount: 3500000 },
          { category: 'CARWASH', amount: 800000 },
        ],
      },
      {
        clientName: 'Demo: Usmonovlar oilasi',
        clientPhone: '+998907001003',
        eventDate: daysAgo(12),
        guestCount: 150,
        tableCapacity: 10,
        menuIndex: 0,
        status: 'COMPLETED',
        payments: [{ amount: 24000000, daysOffset: -3, method: 'CASH' }],
        expenses: [
          { category: 'SHOPPING', amount: 5500000 },
          { category: 'CHEF', amount: 2000000 },
          { category: 'WAITERS', amount: 1800000 },
          { category: 'OTHER', amount: 500000 },
        ],
      },
      {
        clientName: 'Demo: VIP — Alimovlar',
        clientPhone: '+998907001004',
        eventDate: daysAgo(5),
        guestCount: 320,
        tableCapacity: 12,
        menuIndex: 3,
        status: 'COMPLETED',
        payments: [
          { amount: 50000000, daysOffset: -20, method: 'TRANSFER' },
          { amount: 62000000, daysOffset: -1, method: 'TRANSFER' },
        ],
        expenses: [
          { category: 'SHOPPING', amount: 18000000 },
          { category: 'ARTIST', amount: 15000000 },
          { category: 'CAMERAMAN', amount: 10000000 },
          { category: 'KORTEJ', amount: 8000000 },
          { category: 'CHEF', amount: 6000000 },
          { category: 'WAITERS', amount: 5000000 },
          { category: 'ZAVZAL', amount: 3000000 },
        ],
      },
      {
        clientName: 'Demo: Ertangi to\'y — Saidovlar',
        clientPhone: '+998907001005',
        eventDate: daysFromNow(1),
        guestCount: 220,
        tableCapacity: 10,
        menuIndex: 1,
        status: 'CONFIRMED',
        notes: 'Ertaga — dashboardda ko\'rinadi',
        payments: [{ amount: 18000000, daysOffset: -7, method: 'CARD' }],
        expenses: [{ category: 'SHOPPING', amount: 2000000, note: 'Oldindan bozorlik' }],
      },
      {
        clientName: 'Demo: Kelgusi hafta — Nazarovlar',
        clientPhone: '+998907001006',
        eventDate: daysFromNow(4),
        guestCount: 180,
        tableCapacity: 10,
        menuIndex: 0,
        status: 'CONFIRMED',
        payments: [{ amount: 10000000, daysOffset: -2, method: 'CASH' }],
      },
      {
        clientName: 'Demo: Band qilingan — Tursunovlar',
        clientPhone: '+998907001007',
        eventDate: daysFromNow(10),
        guestCount: 260,
        tableCapacity: 12,
        menuIndex: 2,
        status: 'PENDING',
        payments: [{ amount: 15000000, daysOffset: 0, method: 'TRANSFER' }],
      },
      {
        clientName: 'Demo: Bekor qilingan',
        clientPhone: '+998907001008',
        eventDate: daysFromNow(15),
        guestCount: 100,
        tableCapacity: 10,
        menuIndex: 0,
        status: 'CANCELLED',
      },
    ];

    for (const spec of eventSpecs) {
      const menu = menus[spec.menuIndex]!;
      const totalPrice = Number(menu.pricePerPerson) * spec.guestCount;
      const event = await prisma.event.create({
        data: {
          clientName: spec.clientName,
          clientPhone: spec.clientPhone,
          eventDate: spec.eventDate,
          guestCount: spec.guestCount,
          tableCapacity: spec.tableCapacity,
          menuId: menu.id,
          totalPrice,
          status: spec.status,
          notes: spec.notes,
          createdById: admin.id,
        },
      });

      const assignPool = [...approvedWaiters.slice(0, 4), ...chefs.slice(0, 1)];
      for (const worker of assignPool) {
        if (spec.status === 'CANCELLED') break;
        await prisma.eventWorkerAssignment.create({
          data: {
            eventId: event.id,
            workerId: worker.id,
            assignedById: zavzal.id,
            roleAtEvent: worker.position === 'CHEF' ? 'Oshpaz' : 'Afitsant',
          },
        });
      }

      for (const p of spec.payments ?? []) {
        const payDate = new Date(spec.eventDate);
        payDate.setDate(payDate.getDate() + p.daysOffset);
        await prisma.payment.create({
          data: {
            eventId: event.id,
            amount: p.amount,
            paymentDate: payDate,
            method: p.method,
            createdById: admin.id,
            note: 'Demo to\'lov',
          },
        });
      }

      for (const e of spec.expenses ?? []) {
        await prisma.eventExpense.create({
          data: {
            eventId: event.id,
            category: e.category,
            amount: e.amount,
            note: e.note,
            createdById: admin.id,
          },
        });
      }
    }
    console.log(`${eventSpecs.length} ta demo to'y + to'lov/xarajat yaratildi.`);

    const chef = chefs[0];
    const tomorrowEvent = await prisma.event.findFirst({
      where: { clientName: 'Demo: Ertangi to\'y — Saidovlar' },
    });
    if (chef && tomorrowEvent) {
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
        where: { clientName: 'Demo: Karimovlar oilasi' },
      });
      if (pastEvent) {
        await prisma.shoppingList.create({
          data: {
            eventId: pastEvent.id,
            createdByWorkerId: chef.id,
            status: 'PURCHASED',
            reviewedById: admin.id,
            reviewedAt: daysAgo(46),
            items: {
              create: [
                { name: 'Kartoshka', quantity: 40, unit: 'KG', unitPrice: 4000, isPurchased: true },
                { name: 'Piyoz', quantity: 20, unit: 'KG', unitPrice: 3000, isPurchased: true },
                { name: "Qo'y go'shti", quantity: 35, unit: 'KG', unitPrice: 95000, isPurchased: true },
              ],
            },
          },
        });
      }
      console.log('Bozorlik ro\'yxatlari yaratildi.');
    }
  }

  console.log('\n--- Demo login ---');
  console.log(`SUPER_ADMIN  ${superAdminPhone} / ${superAdminPassword}`);
  console.log('ADMIN        +998901111111 / Admin2024!');
  console.log('ZAVZAL       +998902222222 / Zavzal2024!');
  console.log('OSHPAZ       +998903030301 / PIN 1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
