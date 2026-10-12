/** Uzbek in the original column, Russian in *Ru. Keys are the text already stored. */

export const STANDARD_DESCRIPTION = {
  description:
    "Cheksiz miqdorda sovuq va issiq gazaklar, issiq taomlar, salatlar, mevalar va ichimliklar.",
  descriptionRu:
    "Холодные и горячие закуски, горячие блюда, салаты, фрукты и напитки без ограничений.",
};

export const VIP_DESCRIPTION = {
  description:
    "Kengaytirilgan VIP dasturxon: baliq, ikra, zaytun, turshak va ichimliklar cheksiz.",
  descriptionRu:
    "Расширенный VIP-стол: рыба, икра, оливки, сухофрукты и напитки без ограничений.",
};

export const MENU_TEXTS: {
  match: string[];
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;
}[] = [
  {
    match: ["150 mehmon", "150 гостей"],
    name: "150 mehmon",
    nameRu: "150 гостей",
    ...STANDARD_DESCRIPTION,
  },
  {
    match: ["200 mehmon", "200 гостей"],
    name: "200 mehmon",
    nameRu: "200 гостей",
    ...STANDARD_DESCRIPTION,
  },
  {
    match: ["VIP menyu", "VIP меню"],
    name: "VIP menyu",
    nameRu: "VIP меню",
    ...VIP_DESCRIPTION,
  },
];

const UNLIMITED_RU = "Без ограничений";

/** Current Russian dish name → Uzbek name and description. */
export const DISH_UZ: Record<string, { name: string; description?: string }> = {
  "Мясное ассорти": {
    name: "Go'sht assorti",
    description: "Qazi, mol tili, archa ruleti, kurka",
  },
  "Корабельный суши": { name: "Kema sushi" },
  "Селёдка по-русски": { name: "Ruscha seld" },
  "Сырная тарелка": {
    name: "Pishloq tarelkasi",
    description: "Marmar, yantar, golland, brinza, asal assorti",
  },
  "Овощное ассорти": {
    name: "Sabzavot assorti",
    description: "Pomidor, bodring, bulg'or qalampiri, qalampir, ko'kat",
  },
  "Маринованное ассорти": {
    name: "Marinadlangan assorti",
    description: "Qo'ziqorin",
  },
  "Самса с мясом": { name: "Go'shtli somsa" },
  "Куриные крылышки": { name: "Tovuq qanotchalari" },
  "Буреке с соусом": { name: "Sousli burek" },
  "Фрикадельки с лапшой": { name: "Lapshali frikadelka" },
  "Фирменное блюдо «ИКБОЛ»": { name: "«IQBOL» firmali taom" },
  "Салат Цезарь": { name: "Sezar salati" },
  "Салат Мужской каприз": { name: "Erkaklar injiqligi salati" },
  "Салат Японский": { name: "Yapon salati" },
  "Салат Икбол": { name: "Iqbol salati" },
  "Тарталетки": { name: "Tartaletka", description: "Pirojniy" },
  "Хлебное ассорти": { name: "Non assorti" },
  "Фруктовая нарезка": { name: "Meva kesmasi", description: "Sitruslar" },
  "Арбуз и дыня": { name: "Tarvuz va qovun" },
  "Сок в ассортименте": { name: "Sharbat assorti", description: "Cheksiz" },
  "Мохито в ассортименте": { name: "Mohito assorti", description: "Cheksiz" },
  "Минеральная вода с газом": { name: "Gazli mineral suv", description: "Cheksiz" },
  "Минеральная вода без газа": {
    name: "Gazsiz mineral suv",
    description: "Cheksiz",
  },
  "Fanta, Coca-Cola, Pepsi": {
    name: "Fanta, Coca-Cola, Pepsi",
    description: "Cheksiz",
  },
  "Жюльен куриный": { name: "Tovuq julyen" },
  "Икра в тарталетках": {
    name: "Tartaletkada ikra",
    description: "Qizil va qora ikra",
  },
  "КФС ассорти": { name: "KFC assorti" },
  "Лаваш ассорти": { name: "Lavash assorti", description: "Pishloq va brinza" },
  "Миндаль": { name: "Bodom" },
  "Рыбный ассорти": {
    name: "Baliq assorti",
    description: "Skumbriya, syomga, maslyanka",
  },
  "Фисташки": { name: "Pista" },
  "Чёрные и зелёные оливки": { name: "Qora va yashil zaytun" },
};

export function localizeDish(dish: { name: string; description?: string | null }) {
  const hit = DISH_UZ[dish.name];
  const ruDescription = dish.description?.trim() ? dish.description : null;
  const uzDescription =
    hit?.description ??
    (ruDescription === UNLIMITED_RU ? "Cheksiz" : ruDescription);
  return {
    name: hit?.name ?? dish.name,
    nameRu: hit ? dish.name : dish.name,
    description: uzDescription,
    descriptionRu: ruDescription,
  };
}

export const CAPTION_RU: Record<string, string> = {
  "Asosiy zal": "Главный зал",
  "Zal panoramasi": "Панорама зала",
  "Stol bezagi": "Украшение стола",
  Servirovka: "Сервировка",
  Kortej: "Кортеж",
  "Foto zona": "Фотозона",
};

export const CLIENT_NAME_RU: Record<string, string> = {
  "Demo: Karimovlar oilasi": "Demo: семья Каримовых",
  "Demo: Rahimovlar to'yi": "Demo: свадьба Рахимовых",
  "Demo: Usmonovlar oilasi": "Demo: семья Усмановых",
  "Demo: VIP — Alimovlar": "Demo: VIP — Алимовы",
  "Demo: Ertangi to'y — Saidovlar": "Demo: завтрашняя свадьба — Саидовы",
  "Demo: Kelgusi hafta — Nazarovlar": "Demo: следующая неделя — Назаровы",
  "Demo: Band qilingan — Tursunovlar": "Demo: забронировано — Турсуновы",
  "Demo: Bekor qilingan": "Demo: отменено",
  "Test: 10-oktabr": "Test: 10 октября",
  "Test: 15-oktabr": "Test: 15 октября",
};

export const NOTE_RU: Record<string, string> = {
  "Klassik to'y, kechki dasturxon": "Классическая свадьба, вечерний дастархан",
  "Ertaga — dashboardda ko'rinadi": "Завтра — видно на панели",
  Bozorlik: "Закупки",
  "Oldindan bozorlik": "Закупки заранее",
  "Demo to'lov": "Демо-оплата",
};

/** Warehouse and shopping-list names: Uzbek key, Russian value. */
export const INVENTORY_NAME_RU: Record<string, string> = {
  "12 yangi tarelka": "12 новых тарелок",
  "6 tarelka": "6 тарелок",
  "7 eski tarelka": "7 старых тарелок",
  "7 tarelka": "7 тарелок",
  "9 eski tarelka": "9 старых тарелок",
  "9 tarelka": "9 тарелок",
  "9 yangi tarelka": "9 новых тарелок",
  "Achchiq qalampir": "Острый перец",
  Ananas: "Ананас",
  Anor: "Гранат",
  Apelsin: "Апельсин",
  Asal: "Мёд",
  Aval: "Авал",
  "Aval — 10 razmer": "Авал — размер 10",
  "Aval — 12 razmer": "Авал — размер 12",
  "Aval — 6 razmer": "Авал — размер 6",
  "Aysberg salat": "Салат айсберг",
  Banan: "Банан",
  Baqlajon: "Баклажан",
  Bodom: "Миндаль",
  Bodring: "Огурец",
  Brinza: "Брынза",
  "Cherri pomidor": "Помидоры черри",
  Chonak: "Пиала",
  "Choy (ko'k)": "Чай (зелёный)",
  "Choy (qora)": "Чай (чёрный)",
  "Coca-Cola": "Coca-Cola",
  "Dumba yog'i": "Курдючный жир",
  "Eski meva": "Старые фрукты",
  "Eski piyola": "Старая пиала",
  Fanta: "Fanta",
  Fujir: "Фужер",
  "Furukta soladigan idish": "Блюдо для фруктов",
  "Gazli mineral suv": "Минеральная вода с газом",
  "Gazsiz mineral suv": "Минеральная вода без газа",
  Grafin: "Графин",
  Guruch: "Рис",
  Jambil: "Джамбил",
  "Julian idish": "Форма для жюльена",
  Karam: "Капуста",
  Kartoshka: "Картофель",
  Kashnich: "Кинза",
  Ketchup: "Кетчуп",
  "Kichik vaza": "Маленькая ваза",
  "Kichkina qoshiq": "Маленькая ложка",
  "Kichkina yangi tarelka": "Маленькая новая тарелка",
  Kivi: "Киви",
  "Ko'k piyoz": "Зелёный лук",
  Kosa: "Коса",
  Kremanka: "Креманка",
  "Kurka go'shti": "Индейка",
  Lagan: "Лаган",
  Lapsha: "Лапша",
  Lavash: "Лаваш",
  Limon: "Лимон",
  Makaron: "Макароны",
  "Makkajo'xori (konserva)": "Кукуруза (консервы)",
  Mandarin: "Мандарин",
  Martinka: "Мартинка",
  Mayiz: "Изюм",
  Mayonez: "Майонез",
  "Mesnoy sariq": "Жёлтая месная",
  "Meva oq": "Белая фруктовая",
  "Mol go'shti": "Говядина",
  "Mol tili": "Говяжий язык",
  Muz: "Лёд",
  "Muz idish": "Посуда для льда",
  Nok: "Груша",
  Non: "Хлеб",
  "Non idish": "Хлебница",
  "Non-idish": "Хлебница",
  Nori: "Нори",
  "O'simlik yog'i": "Растительное масло",
  Olma: "Яблоко",
  "Oq kichkina vaza": "Белая маленькая ваза",
  "Oq mesnoy": "Белая месная",
  "Oyoqli sir idish": "Сырная тарелка на ножке",
  Parmezan: "Пармезан",
  Pepsi: "Pepsi",
  Petrushka: "Петрушка",
  Pichonitsa: "Пичоница",
  Pichoq: "Нож",
  "Pichoq 2": "Нож 2",
  "Pishloq (golland)": "Сыр (голландский)",
  Pista: "Фисташки",
  Piyola: "Пиала",
  Piyoz: "Лук",
  Pomidor: "Помидор",
  Qahva: "Кофе",
  "Qalampir (bulg'or)": "Перец (болгарский)",
  Qatiq: "Катык",
  "Qatlamli xamir": "Слоёное тесто",
  Qaymoq: "Сливки",
  Qazi: "Казы",
  "Qisqichbaqa tayoqchalari": "Крабовые палочки",
  Qiyma: "Фарш",
  "Qizil ikra": "Красная икра",
  "Qizil qalampir (maydalangan)": "Красный перец (молотый)",
  "Qo'y go'shti": "Баранина",
  "Qo'ziqorin": "Грибы",
  "Qora murch": "Чёрный перец",
  Qoshiq: "Ложка",
  "Qoshiq 2": "Ложка 2",
  Qovun: "Дыня",
  Rayhon: "Базилик",
  Ribniy: "Рыбный",
  Rumka: "Рюмка",
  Sabzi: "Морковь",
  "Salat dumaloq": "Круглая салатница",
  "Salat tortburchak": "Прямоугольная салатница",
  Salatnitsa: "Салатница",
  Salfetka: "Салфетка",
  "Salfetka (qog'oz)": "Салфетка (бумажная)",
  Sarimsoq: "Чеснок",
  "Sariq tarelka": "Жёлтая тарелка",
  "Sariyog'": "Сливочное масло",
  Selyodka: "Сельдь",
  Shakar: "Сахар",
  "Sharbat (assorti)": "Сок (ассорти)",
  "Shirinlik (pirojniy)": "Сладость (пирожное)",
  Sirka: "Уксус",
  Skumbriya: "Скумбрия",
  Smetana: "Сметана",
  Sovusnitsa: "Соусник",
  "Soya sousi": "Соевый соус",
  "Sushi guruchi": "Рис для суши",
  Sut: "Молоко",
  "Syomga (losos)": "Сёмга (лосось)",
  Tarelka: "Тарелка",
  Tartaletka: "Тарталетка",
  Tarvuz: "Арбуз",
  "Tovuq filesi": "Куриное филе",
  "Tovuq go'shti": "Курица",
  "Tovuq idish": "Посуда для курицы",
  "Tovuq qanotchalari": "Куриные крылышки",
  Turshak: "Сухофрукты",
  Tuxum: "Яйцо",
  Tuz: "Соль",
  "Tuz-muruch": "Соль и перец",
  Tvorog: "Творог",
  Ukrop: "Укроп",
  Un: "Мука",
  Uzum: "Виноград",
  Vilka: "Вилка",
  Yalpiz: "Мята",
  "Yong'oq": "Грецкий орех",
  Zaytun: "Оливки",
  "Zaytun yog'i": "Оливковое масло",
  Zira: "Зира",
  "Zubachistka idish": "Подставка для зубочисток",
};
