import type { Prisma } from '@prisma/client';

/**
 * The hall's menus as they are sold. Photos are stock placeholders until the
 * hall uploads its own from the menu studio.
 */

const dishPhoto = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&q=80`;

const coverImages = [
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc8?w=1200&q=80',
  'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=80',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80',
];

export const HALL_PHOTOS = [
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1000&q=80',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc8?w=1000&q=80',
];

export const TABLE_PHOTOS = [
  'https://images.unsplash.com/photo-1478144592103-25e218a04893?w=1000&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80',
];

export const KORTEJ_PHOTO =
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&q=80';
export const PHOTOGRAPHER_PHOTO =
  'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1000&q=80';

export interface DishSeed {
  category: Prisma.MenuDishCreateManyInput['category'];
  name: string;
  description?: string;
  photo: string;
}

const unlimited = 'Без ограничений';

const standardDishes: DishSeed[] = [
  {
    category: 'COLD_APPETIZER',
    name: 'Мясное ассорти',
    description: 'Казы, язык говяжий, рулет арча, индейка',
    photo: dishPhoto('1544025162-d76694265947'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Корабельный суши',
    photo: dishPhoto('1579871494447-9811cf80d66c'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Селёдка по-русски',
    photo: dishPhoto('1519708227418-c8fd9a32b7a2'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Сырная тарелка',
    description: 'Мраморный, янтарный, голландский, брынза, мёд ассорти',
    photo: dishPhoto('1452195100486-9cc805987862'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Овощное ассорти',
    description: 'Помидоры, огурцы, болгарский перец, стручковый перец, зелень',
    photo: dishPhoto('1540420773420-3366772f4999'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Маринованное ассорти',
    description: 'Грибы',
    photo: dishPhoto('1518977956812-cd3dbadaaf31'),
  },
  {
    category: 'HOT_APPETIZER',
    name: 'Самса с мясом',
    photo: dishPhoto('1601050690597-df0568f70950'),
  },
  {
    category: 'HOT_APPETIZER',
    name: 'Куриные крылышки',
    photo: dishPhoto('1527477396000-e27163b481c2'),
  },
  {
    category: 'HOT_APPETIZER',
    name: 'Буреке с соусом',
    photo: dishPhoto('1608039829572-78524f79c4c7'),
  },
  {
    category: 'FIRST_DISH',
    name: 'Фрикадельки с лапшой',
    photo: dishPhoto('1617093727343-374698b1b08d'),
  },
  {
    category: 'SECOND_DISH',
    name: 'Фирменное блюдо «ИКБОЛ»',
    photo: dishPhoto('1414235077428-338989a2e8c0'),
  },
  {
    category: 'SALAD',
    name: 'Салат Цезарь',
    photo: dishPhoto('1550304943-4f24f54ddde9'),
  },
  {
    category: 'SALAD',
    name: 'Салат Мужской каприз',
    photo: dishPhoto('1546069901-ba9599a7e63c'),
  },
  {
    category: 'SALAD',
    name: 'Салат Японский',
    photo: dishPhoto('1540189549336-e6e99c3679fe'),
  },
  {
    category: 'SALAD',
    name: 'Салат Икбол',
    photo: dishPhoto('1512621776951-a57141f2eefd'),
  },
  {
    category: 'DESSERT',
    name: 'Тарталетки',
    description: 'Пирожное',
    photo: dishPhoto('1464349095431-e9a21285b5f3'),
  },
  {
    category: 'BREAD',
    name: 'Хлебное ассорти',
    photo: dishPhoto('1509440159596-0249088772ff'),
  },
  {
    category: 'FRUIT',
    name: 'Фруктовая нарезка',
    description: 'Цитрусы',
    photo: dishPhoto('1619566636858-adf3ef46400b'),
  },
  {
    category: 'FRUIT',
    name: 'Арбуз и дыня',
    photo: dishPhoto('1587049352846-4a222e784d38'),
  },
  {
    category: 'DRINK',
    name: 'Сок в ассортименте',
    description: unlimited,
    photo: dishPhoto('1600271886742-f049cd451bba'),
  },
  {
    category: 'DRINK',
    name: 'Мохито в ассортименте',
    description: unlimited,
    photo: dishPhoto('1551538827-9c037cb4f32a'),
  },
  {
    category: 'DRINK',
    name: 'Минеральная вода с газом',
    description: unlimited,
    photo: dishPhoto('1548839140-29a749e1cf4d'),
  },
  {
    category: 'DRINK',
    name: 'Минеральная вода без газа',
    description: unlimited,
    photo: dishPhoto('1560023907-5f339617ea30'),
  },
  {
    category: 'DRINK',
    name: 'Fanta, Coca-Cola, Pepsi',
    description: unlimited,
    photo: dishPhoto('1629203851122-3726ecdf080e'),
  },
];

const vipDishes: DishSeed[] = [
  {
    category: 'COLD_APPETIZER',
    name: 'Мясное ассорти',
    description: 'Казы, язык говяжий, рулет арча, индейка',
    photo: dishPhoto('1544025162-d76694265947'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Рыбный ассорти',
    description: 'Скумбрия, сёмга, масляная',
    photo: dishPhoto('1498654896293-37aacf113fd9'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'КФС ассорти',
    photo: dishPhoto('1626082927389-6cd097cdc6ec'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Икра в тарталетках',
    description: 'Красная и чёрная икра',
    photo: dishPhoto('1559339352-11d035aa65de'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Корабельный суши',
    photo: dishPhoto('1579871494447-9811cf80d66c'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Селёдка по-русски',
    photo: dishPhoto('1519708227418-c8fd9a32b7a2'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Сырная тарелка',
    description: 'Мраморный, янтарный, голландский, брынза, мёд ассорти',
    photo: dishPhoto('1452195100486-9cc805987862'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Овощное ассорти',
    description: 'Помидоры, огурцы, болгарский перец, стручковый перец, зелень',
    photo: dishPhoto('1540420773420-3366772f4999'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Маринованное ассорти',
    description: 'Грибы',
    photo: dishPhoto('1518977956812-cd3dbadaaf31'),
  },
  {
    category: 'COLD_APPETIZER',
    name: 'Лаваш ассорти',
    description: 'Сыр и брынза',
    photo: dishPhoto('1626700051175-6818013e1d4f'),
  },
  {
    category: 'HOT_APPETIZER',
    name: 'Самса с мясом',
    photo: dishPhoto('1601050690597-df0568f70950'),
  },
  {
    category: 'HOT_APPETIZER',
    name: 'Жюльен куриный',
    photo: dishPhoto('1604908176997-125f25cc6f3d'),
  },
  {
    category: 'FIRST_DISH',
    name: 'Фрикадельки с лапшой',
    photo: dishPhoto('1617093727343-374698b1b08d'),
  },
  {
    category: 'SECOND_DISH',
    name: 'Фирменное блюдо «ИКБОЛ»',
    photo: dishPhoto('1414235077428-338989a2e8c0'),
  },
  {
    category: 'SALAD',
    name: 'Салат Цезарь',
    photo: dishPhoto('1550304943-4f24f54ddde9'),
  },
  {
    category: 'SALAD',
    name: 'Салат Мужской каприз',
    photo: dishPhoto('1546069901-ba9599a7e63c'),
  },
  {
    category: 'SALAD',
    name: 'Салат Японский',
    photo: dishPhoto('1540189549336-e6e99c3679fe'),
  },
  {
    category: 'SALAD',
    name: 'Салат Икбол',
    photo: dishPhoto('1512621776951-a57141f2eefd'),
  },
  {
    category: 'SALAD',
    name: 'Чёрные и зелёные оливки',
    photo: dishPhoto('1474979266404-7eaacbcd87c5'),
  },
  {
    category: 'DESSERT',
    name: 'Тарталетки',
    description: 'Пирожное',
    photo: dishPhoto('1464349095431-e9a21285b5f3'),
  },
  {
    category: 'BREAD',
    name: 'Хлебное ассорти',
    photo: dishPhoto('1509440159596-0249088772ff'),
  },
  {
    category: 'DRIED_FRUIT',
    name: 'Фисташки',
    photo: dishPhoto('1599599810769-bcde5a160d32'),
  },
  {
    category: 'DRIED_FRUIT',
    name: 'Миндаль',
    photo: dishPhoto('1508061253366-f7da158b6d46'),
  },
  {
    category: 'FRUIT',
    name: 'Фруктовая нарезка',
    description: 'Цитрусы',
    photo: dishPhoto('1619566636858-adf3ef46400b'),
  },
  {
    category: 'FRUIT',
    name: 'Арбуз и дыня',
    photo: dishPhoto('1587049352846-4a222e784d38'),
  },
  {
    category: 'DRINK',
    name: 'Сок в ассортименте',
    description: unlimited,
    photo: dishPhoto('1600271886742-f049cd451bba'),
  },
  {
    category: 'DRINK',
    name: 'Мохито в ассортименте',
    description: unlimited,
    photo: dishPhoto('1551538827-9c037cb4f32a'),
  },
  {
    category: 'DRINK',
    name: 'Минеральная вода с газом',
    description: unlimited,
    photo: dishPhoto('1548839140-29a749e1cf4d'),
  },
  {
    category: 'DRINK',
    name: 'Минеральная вода без газа',
    description: unlimited,
    photo: dishPhoto('1560023907-5f339617ea30'),
  },
  {
    category: 'DRINK',
    name: 'Fanta, Coca-Cola, Pepsi',
    description: unlimited,
    photo: dishPhoto('1629203851122-3726ecdf080e'),
  },
];

export interface MenuSeed {
  name: string;
  pricePerPerson: number;
  guestCount: number;
  description: string;
  isVip: boolean;
  cover: string;
  dishes: DishSeed[];
}

export const MENU_SEEDS: MenuSeed[] = [
  {
    name: '150 гостей',
    pricePerPerson: 300000,
    guestCount: 150,
    description:
      'Холодные и горячие закуски, горячие блюда, салаты, фрукты и напитки без ограничений.',
    isVip: false,
    cover: coverImages[0],
    dishes: standardDishes,
  },
  {
    name: '200 гостей',
    pricePerPerson: 300000,
    guestCount: 200,
    description:
      'Холодные и горячие закуски, горячие блюда, салаты, фрукты и напитки без ограничений.',
    isVip: false,
    cover: coverImages[1],
    dishes: standardDishes,
  },
  {
    name: 'VIP menyu',
    pricePerPerson: 370000,
    guestCount: 408,
    description:
      'Расширенный VIP-стол: рыба, икра, оливки, сухофрукты и напитки без ограничений.',
    isVip: true,
    cover: coverImages[3],
    dishes: vipDishes,
  },
];
