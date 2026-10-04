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

  const dishPhoto = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=80`;
  const hallPhotos = [
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1000&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc8?w=1000&q=80',
  ];
  const tablePhotos = [
    'https://images.unsplash.com/photo-1478144592103-25e218a04893?w=1000&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80',
  ];

  type DishSeed = {
    category: Prisma.MenuDishCreateManyInput['category'];
    name: string;
    description?: string;
    photo: string;
  };

  const unlimited = 'Без ограничений';
  const standardDishes: DishSeed[] = [
    { category: 'COLD_APPETIZER', name: 'Мясное ассорти', description: 'Казы, язык говяжий, рулет арча, индейка', photo: dishPhoto('1544025162-d76694265947') },
    { category: 'COLD_APPETIZER', name: 'Корабельный суши', photo: dishPhoto('1579871494447-9811cf80d66c') },
    { category: 'COLD_APPETIZER', name: 'Селёдка по-русски', photo: dishPhoto('1519708227418-c8fd9a32b7a2') },
    { category: 'COLD_APPETIZER', name: 'Сырная тарелка', description: 'Мраморный, янтарный, голландский, брынза, мёд ассорти', photo: dishPhoto('1452195100486-9cc805987862') },
    { category: 'COLD_APPETIZER', name: 'Овощное ассорти', description: 'Помидоры, огурцы, болгарский перец, стручковый перец, зелень', photo: dishPhoto('1540420773420-3366772f4999') },
    { category: 'COLD_APPETIZER', name: 'Маринованное ассорти', description: 'Грибы', photo: dishPhoto('1518977956812-cd3dbadaaf31') },
    { category: 'HOT_APPETIZER', name: 'Самса с мясом', photo: dishPhoto('1601050690597-df0568f70950') },
    { category: 'HOT_APPETIZER', name: 'Куриные крылышки', photo: dishPhoto('1527477396000-e27163b481c2') },
    { category: 'HOT_APPETIZER', name: 'Буреке с соусом', photo: dishPhoto('1608039829572-78524f79c4c7') },
    { category: 'FIRST_DISH', name: 'Фрикадельки с лапшой', photo: dishPhoto('1617093727343-374698b1b08d') },
    { category: 'SECOND_DISH', name: 'Фирменное блюдо «ИКБОЛ»', photo: dishPhoto('1414235077428-338989a2e8c0') },
    { category: 'SALAD', name: 'Салат Цезарь', photo: dishPhoto('1550304943-4f24f54ddde9') },
    { category: 'SALAD', name: 'Салат Мужской каприз', photo: dishPhoto('1546069901-ba9599a7e63c') },
    { category: 'SALAD', name: 'Салат Японский', photo: dishPhoto('1540189549336-e6e99c3679fe') },
    { category: 'SALAD', name: 'Салат Икбол', photo: dishPhoto('1512621776951-a57141f2eefd') },
    { category: 'DESSERT', name: 'Тарталетки', description: 'Пирожное', photo: dishPhoto('1464349095431-e9a21285b5f3') },
    { category: 'BREAD', name: 'Хлебное ассорти', photo: dishPhoto('1509440159596-0249088772ff') },
    { category: 'FRUIT', name: 'Фруктовая нарезка', description: 'Цитрусы', photo: dishPhoto('1619566636858-adf3ef46400b') },
    { category: 'FRUIT', name: 'Арбуз и дыня', photo: dishPhoto('1587049352846-4a222e784d38') },
    { category: 'DRINK', name: 'Сок в ассортименте', description: unlimited, photo: dishPhoto('1600271886742-f049cd451bba') },
    { category: 'DRINK', name: 'Мохито в ассортименте', description: unlimited, photo: dishPhoto('1551538827-9c037cb4f32a') },
    { category: 'DRINK', name: 'Минеральная вода с газом', description: unlimited, photo: dishPhoto('1548839140-29a749e1cf4d') },
    { category: 'DRINK', name: 'Минеральная вода без газа', description: unlimited, photo: dishPhoto('1560023907-5f339617ea30') },
    { category: 'DRINK', name: 'Fanta, Coca-Cola, Pepsi', description: unlimited, photo: dishPhoto('1629203851122-3726ecdf080e') },
  ];

  const vipDishes: DishSeed[] = [
    { category: 'COLD_APPETIZER', name: 'Мясное ассорти', description: 'Казы, язык говяжий, рулет арча, индейка', photo: dishPhoto('1544025162-d76694265947') },
    { category: 'COLD_APPETIZER', name: 'Рыбный ассорти', description: 'Скумбрия, сёмга, масляная', photo: dishPhoto('1498654896293-37aacf113fd9') },
    { category: 'COLD_APPETIZER', name: 'КФС ассорти', photo: dishPhoto('1626082927389-6cd097cdc6ec') },
    { category: 'COLD_APPETIZER', name: 'Икра в тарталетках', description: 'Красная и чёрная икра', photo: dishPhoto('1559339352-11d035aa65de') },
    { category: 'COLD_APPETIZER', name: 'Корабельный суши', photo: dishPhoto('1579871494447-9811cf80d66c') },
    { category: 'COLD_APPETIZER', name: 'Селёдка по-русски', photo: dishPhoto('1519708227418-c8fd9a32b7a2') },
    { category: 'COLD_APPETIZER', name: 'Сырная тарелка', description: 'Мраморный, янтарный, голландский, брынза, мёд ассорти', photo: dishPhoto('1452195100486-9cc805987862') },
    { category: 'COLD_APPETIZER', name: 'Овощное ассорти', description: 'Помидоры, огурцы, болгарский перец, стручковый перец, зелень', photo: dishPhoto('1540420773420-3366772f4999') },
    { category: 'COLD_APPETIZER', name: 'Маринованное ассорти', description: 'Грибы', photo: dishPhoto('1518977956812-cd3dbadaaf31') },
    { category: 'COLD_APPETIZER', name: 'Лаваш ассорти', description: 'Сыр и брынза', photo: dishPhoto('1626700051175-6818013e1d4f') },
    { category: 'HOT_APPETIZER', name: 'Самса с мясом', photo: dishPhoto('1601050690597-df0568f70950') },
    { category: 'HOT_APPETIZER', name: 'Жюльен куриный', photo: dishPhoto('1604908176997-125f25cc6f3d') },
    { category: 'FIRST_DISH', name: 'Фрикадельки с лапшой', photo: dishPhoto('1617093727343-374698b1b08d') },
    { category: 'SECOND_DISH', name: 'Фирменное блюдо «ИКБОЛ»', photo: dishPhoto('1414235077428-338989a2e8c0') },
    { category: 'SALAD', name: 'Салат Цезарь', photo: dishPhoto('1550304943-4f24f54ddde9') },
    { category: 'SALAD', name: 'Салат Мужской каприз', photo: dishPhoto('1546069901-ba9599a7e63c') },
    { category: 'SALAD', name: 'Салат Японский', photo: dishPhoto('1540189549336-e6e99c3679fe') },
    { category: 'SALAD', name: 'Салат Икбол', photo: dishPhoto('1512621776951-a57141f2eefd') },
    { category: 'SALAD', name: 'Чёрные и зелёные оливки', photo: dishPhoto('1474979266404-7eaacbcd87c5') },
    { category: 'DESSERT', name: 'Тарталетки', description: 'Пирожное', photo: dishPhoto('1464349095431-e9a21285b5f3') },
    { category: 'BREAD', name: 'Хлебное ассорти', photo: dishPhoto('1509440159596-0249088772ff') },
    { category: 'DRIED_FRUIT', name: 'Фисташки', photo: dishPhoto('1599599810769-bcde5a160d32') },
    { category: 'DRIED_FRUIT', name: 'Миндаль', photo: dishPhoto('1508061253366-f7da158b6d46') },
    { category: 'FRUIT', name: 'Фруктовая нарезка', description: 'Цитрусы', photo: dishPhoto('1619566636858-adf3ef46400b') },
    { category: 'FRUIT', name: 'Арбуз и дыня', photo: dishPhoto('1587049352846-4a222e784d38') },
    { category: 'DRINK', name: 'Сок в ассортименте', description: unlimited, photo: dishPhoto('1600271886742-f049cd451bba') },
    { category: 'DRINK', name: 'Мохито в ассортименте', description: unlimited, photo: dishPhoto('1551538827-9c037cb4f32a') },
    { category: 'DRINK', name: 'Минеральная вода с газом', description: unlimited, photo: dishPhoto('1548839140-29a749e1cf4d') },
    { category: 'DRINK', name: 'Минеральная вода без газа', description: unlimited, photo: dishPhoto('1560023907-5f339617ea30') },
    { category: 'DRINK', name: 'Fanta, Coca-Cola, Pepsi', description: unlimited, photo: dishPhoto('1629203851122-3726ecdf080e') },
  ];

  const menuDefs: {
    name: string;
    pricePerPerson: number;
    guestCount: number;
    description: string;
    isVip: boolean;
    cover: string;
    dishes: DishSeed[];
  }[] = [
    {
      name: '150 гостей',
      pricePerPerson: 300000,
      guestCount: 150,
      description: 'Холодные и горячие закуски, горячие блюда, салаты, фрукты и напитки без ограничений.',
      isVip: false,
      cover: coverImages[0],
      dishes: standardDishes,
    },
    {
      name: '200 гостей',
      pricePerPerson: 300000,
      guestCount: 200,
      description: 'Холодные и горячие закуски, горячие блюда, салаты, фрукты и напитки без ограничений.',
      isVip: false,
      cover: coverImages[1],
      dishes: standardDishes,
    },
    {
      name: 'VIP menyu',
      pricePerPerson: 370000,
      guestCount: 408,
      description: 'Расширенный VIP-стол: рыба, икра, оливки, сухофрукты и напитки без ограничений.',
      isVip: true,
      cover: coverImages[3],
      dishes: vipDishes,
    },
  ];

  const menus = [];
  for (const def of menuDefs) {
    let menu = await prisma.menu.findFirst({ where: { name: def.name } });
    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          name: def.name,
          pricePerPerson: def.pricePerPerson,
          guestCount: def.guestCount,
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
          guestCount: def.guestCount,
          isVip: def.isVip,
        },
      });
    }

    await prisma.menuDish.deleteMany({ where: { menuId: menu.id } });
    await prisma.menuDish.createMany({
      data: def.dishes.map((d, i) => ({
        menuId: menu.id,
        category: d.category,
        name: d.name,
        description: d.description,
        photoUrl: d.photo,
        order: i,
      })),
    });

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

  const keepNames = new Set(menuDefs.map((def) => def.name));
  const fallbackMenu = menus[0];
  const retired = await prisma.menu.findMany({
    where: { name: { notIn: [...keepNames] } },
    select: { id: true, name: true },
  });
  for (const old of retired) {
    if (!fallbackMenu) continue;
    await prisma.event.updateMany({ where: { menuId: old.id }, data: { menuId: fallbackMenu.id } });
    await prisma.menu.delete({ where: { id: old.id } });
    console.log(`Eski menyu olib tashlandi: ${old.name}`);
  }

  console.log(`${menus.length} ta menyu (taomlar + media) tayyor.`);

  const dishware: { name: string; quantity: number }[] = [
    { name: 'Kremanka', quantity: 50 },
    { name: 'Martinka', quantity: 362 },
    { name: 'Lagan', quantity: 100 },
    { name: 'Chonak', quantity: 0 },
    { name: 'Fujir', quantity: 312 },
    { name: 'Tarelka', quantity: 10 },
    { name: '9 tarelka', quantity: 231 },
    { name: '7 tarelka', quantity: 574 },
    { name: '6 tarelka', quantity: 265 },
    { name: '9 eski tarelka', quantity: 0 },
    { name: '7 eski tarelka', quantity: 0 },
    { name: 'Pichonitsa', quantity: 47 },
    { name: 'Furukta soladigan idish', quantity: 0 },
    { name: 'Oq mesnoy', quantity: 0 },
    { name: 'Aval', quantity: 12 },
    { name: 'Piyola', quantity: 280 },
    { name: 'Eski piyola', quantity: 325 },
    { name: 'Kosa', quantity: 290 },
    { name: 'Salatnitsa', quantity: 336 },
    { name: 'Ribniy', quantity: 65 },
    { name: 'Salat tortburchak', quantity: 54 },
    { name: 'Salat dumaloq', quantity: 54 },
    { name: 'Tovuq idish', quantity: 0 },
    { name: 'Qoshiq', quantity: 560 },
    { name: 'Pichoq', quantity: 702 },
    { name: 'Qoshiq 2', quantity: 590 },
    { name: 'Vilka', quantity: 590 },
    { name: 'Grafin', quantity: 21 },
    { name: 'Non-idish', quantity: 60 },
    { name: 'Oq kichkina vaza', quantity: 0 },
    { name: 'Tuz-muruch', quantity: 95 },
    { name: 'Zubachistka idish', quantity: 47 },
    { name: 'Salfetka', quantity: 49 },
    { name: 'Sovusnitsa', quantity: 172 },
    { name: 'Muz idish', quantity: 10 },
    { name: 'Julian idish', quantity: 338 },
    { name: 'Rumka', quantity: 135 },
    { name: 'Kichkina qoshiq', quantity: 330 },
    { name: '12 yangi tarelka', quantity: 342 },
    { name: 'Kichkina yangi tarelka', quantity: 332 },
    { name: '9 yangi tarelka', quantity: 231 },
    { name: 'Pichoq 2', quantity: 210 },
    { name: 'Aval — 12 razmer', quantity: 97 },
    { name: 'Aval — 10 razmer', quantity: 180 },
    { name: 'Aval — 6 razmer', quantity: 270 },
    { name: 'Sariq tarelka', quantity: 97 },
    { name: 'Mesnoy sariq', quantity: 34 },
    { name: 'Kichik vaza', quantity: 70 },
    { name: 'Oyoqli sir idish', quantity: 30 },
    { name: 'Meva oq', quantity: 20 },
    { name: 'Eski meva', quantity: 44 },
    { name: 'Non idish', quantity: 100 },
  ];

  const dishNames = new Set(dishware.map((item) => item.name));
  await prisma.inventoryTransaction.deleteMany({
    where: { item: { name: { notIn: [...dishNames] } } },
  });
  const removed = await prisma.inventoryItem.deleteMany({
    where: { name: { notIn: [...dishNames] } },
  });
  for (const item of dishware) {
    await prisma.inventoryItem.upsert({
      where: { name: item.name },
      create: {
        name: item.name,
        unit: 'DONA',
        category: 'DISHWARE',
        quantity: item.quantity,
        productCategory: null,
        minThreshold: null,
      },
      update: {
        unit: 'DONA',
        category: 'DISHWARE',
        quantity: item.quantity,
        productCategory: null,
        minThreshold: null,
      },
    });
  }
  console.log(`Ombor yangilandi: ${dishware.length} ta idish, ${removed.count} ta eski yozuv o'chirildi.`);

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
        menuIndex: 1,
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
        menuIndex: 2,
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
        menuIndex: 1,
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
