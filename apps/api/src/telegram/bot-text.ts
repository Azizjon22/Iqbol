/**
 * Every line the bot writes, in Uzbek and Russian. `ru` has the type of `uz`,
 * so a missing key is a compile error. Each recipient gets their own
 * language (the `language` field on their account; Telegram's language for
 * chats that are not linked yet).
 */

export type Lang = 'uz' | 'ru';

export function langOf(value?: string | null): Lang {
  return value === 'ru' ? 'ru' : 'uz';
}

/** Telegram's `from.language_code` for a chat that is not linked yet. */
export function langFromTelegram(code?: string): Lang {
  return code?.toLowerCase().startsWith('ru') ? 'ru' : 'uz';
}

export type Command =
  'toylar' | 'tekshir' | 'ombor' | 'hisobot' | 'arxiv' | 'toy' | 'chiqish';

export type Period = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL';

interface ReminderInput {
  date: string;
  time: string;
  name: string;
  guests: number;
  dishes: string;
  hasList: boolean;
}

interface WeddingAccountInput {
  name: string;
  date: string;
  guests: number;
  agreed: string;
  collected: string;
  debt: string | null;
  expenses: string;
  profit: string;
}

const uz = {
  som: "so'm",
  units: { KG: 'kg', LITER: 'litr', DONA: 'dona' } as Record<string, string>,
  and: 'va',
  more: (n: number) => `… va yana ${n} ta`,
  guests: (n: number) => `${n} mehmon`,

  commands: {
    toylar: "Yaqin to'ylar",
    tekshir: 'Eslatmalarni hozir tekshirish',
    ombor: 'Omborda kam qolgan mahsulotlar',
    hisobot: 'Hisob-kitob (PDF)',
    arxiv: "To'ylar arxivi (PDF)",
    toy: "Bitta to'y xarajatlari — mijoz uchun PDF",
    chiqish: 'Botdan uzish',
  } satisfies Record<Command, string>,
  startCommand: 'Botni ulash',
  commandsHeader: 'Buyruqlar:',
  menuButton: 'Ilova',
  homeChef: '📱 Oshpaz sahifasi',
  homeStaff: '📱 Ilovani ochish',
  reportTitles: { ACCOUNTING: '📊 Hisob-kitob', ARCHIVE: '🗂 Arxiv' },
  weddingButton: "🧾 To'y xarajatlari",
  periods: {
    THIS_MONTH: 'Shu oy',
    LAST_MONTH: "O'tgan oy",
    THIS_YEAR: 'Shu yil',
    ALL: 'Butun davr',
  } satisfies Record<Period, string>,

  // Linking
  welcome:
    "Assalomu alaykum! Bu bot to'yxona xodimlari uchun.\n\n" +
    'Ulashning eng oson yo\'li: saytda Profil sahifasini ochib, "Telegram botga ulash" tugmasini bosing.\n\n' +
    'Yoki shu yerda tizimga kiradigan telefon raqamingizni yuboring (masalan, +998901234567).',
  askPhone:
    'Tizimga kiradigan telefon raqamingizni yuboring (masalan, +998901234567) yoki pastdagi tugmani bosing.',
  sharePhone: '📱 Raqamni yuborish',
  badPhone: "Telefon raqami noto'g'ri. Masalan: +998901234567",
  phoneUnknown:
    "Bu raqam tizimda oshpaz yoki admin sifatida ro'yxatdan o'tmagan. Super adminga xabar berildi.",
  phoneUnknownAlert: (phone: string, who: string) =>
    `⚠️ Botga ruxsatsiz kirishga urinish.\n\nRaqam: ${phone}\nTelegram: ${who || "noma'lum"}\n\nBu raqam bazada oshpaz yoki admin sifatida yo'q.`,
  askPin: 'Endi tizimga kiradigan 4 xonali PIN kodingizni yozing.',
  askPassword: 'Endi tizimga kiradigan parolingizni yozing.',
  codeWrong: (message: string) =>
    `${message || "Kod noto'g'ri"}\n\nQayta yozing yoki /start bilan boshidan boshlang.`,
  linkedNow: (name: string, about: string, commands: string) =>
    `✅ ${name}, bot ulandi.\n\n${about}\n\n${commands}`,
  aboutChef: (times: string) =>
    `Ertangi to'ylar uchun bozorlik yozilmagan bo'lsa, soat ${times} da eslatma keladi.`,
  aboutSuperAdmin: (times: string) =>
    `Oshpaz bozorlik yuborsa va to'y yakunlansa, shu yerga xabar keladi. Ko'rilmagan ro'yxatlar soat ${times} da eslatiladi.`,
  aboutOther: 'Ilovani shu yerdan login va parolsiz ochasiz.',
  alreadyLinked: (name: string, commands: string) =>
    `${name}, siz allaqachon ulangansiz.\n\n${commands}`,
  linkExpired:
    'Havola eskirgan yoki allaqachon ishlatilgan. Saytdagi Profil sahifasidan "Telegram botga ulash" tugmasini qayta bosing.',
  unlinked: 'Bot hisobingizdan uzildi. Qayta ulash uchun /start bosing.',
  unlinkedFromProfile:
    'Bot hisobingizdan profil orqali uzildi. Qayta ulash uchun saytdagi Profil sahifasidan "Telegram botga ulash" tugmasini bosing.',
  linkFirst: 'Avval botni hisobingizga ulang: /start',
  startFirst: 'Boshlash uchun /start bosing.',
  languageChanged: "Bot endi o'zbek tilida yozadi.",

  // Rights
  denied: 'Bu buyruq sizga ochiq emas.',
  deniedStock: "Ombor ma'lumotlari sizga ochiq emas.",
  deniedFinance: 'Hisobotlar faqat super admin uchun.',

  // Reports
  reportKeyboardHint:
    "Hisobotlarni PDF ko'rinishida olish uchun pastdagi tugmalardan foydalaning.",
  reportPeriod: (title: string) => `${title} — qaysi davr uchun PDF?`,
  preparing: 'Hisobot tayyorlanmoqda…',
  reportFailed:
    "Hisobotni tayyorlab bo'lmadi, birozdan keyin qayta urinib ko'ring.",
  noPastWeddings: "Hali o'tgan to'y yo'q.",
  weddingPicker:
    "🧾 Qaysi to'yning xarajatlari kerak? (mijozga ko'rsatish uchun, mahsulot narxlarisiz)",

  // /toylar, /ombor, /tekshir
  noUpcoming: "Yaqin kunlarda to'y yo'q.",
  upcomingTitle: "📅 Yaqin to'ylar",
  upcomingRow: (date: string, time: string, name: string, guests: number) =>
    `• ${date}, ${time} — ${name}, ${guests} mehmon`,
  pendingMark: ' (kutilmoqda)',
  stockOk: "Omborda hamma mahsulot yetarli — chegaradan kam qolgani yo'q.",
  lowStockTitle: '📦 Omborda kam qolgan mahsulotlar',
  lowStockRow: (name: string, qty: string, min: string, unit: string) =>
    `• ${name} — ${qty} ${unit} qoldi (chegara: ${min} ${unit})`,
  storeButton: 'Ombor',
  nothingChef: "Ertangi to'ylar uchun bozorlik yozilgan va tasdiqlangan.",
  nothingPending: "Hozircha sizni kutayotgan ish yo'q.",

  // Reminders
  remindChef: (r: ReminderInput) =>
    `🛒 Ertaga to'y bor — ${r.date}, soat ${r.time}\n\n` +
    `${r.name}\n${r.guests} mehmon` +
    (r.dishes ? `\nTaomlar: ${r.dishes}` : '') +
    (r.hasList
      ? "\n\nBozorlik ro'yxati yozilgan, lekin hali tasdiqlanmagan — tasdiqlab, xaridga chiqing."
      : '\n\nShu sana uchun bozorlik yozishingiz kerak.'),
  writeShopping: 'Bozorlik yozish',
  unseenTitle: (n: number) => `📋 ${n} ta bozorlik ro'yxati hali ko'rilmagan:`,
  unseenRow: (where: string, items: number, chef: string, bought: boolean) =>
    `• ${where} — ${items} ta mahsulot, ${chef}${bought ? ', xarid qilindi' : ''}`,
  noEventList: "To'ysiz ro'yxat",

  // Wedding archive
  completed: (a: WeddingAccountInput) =>
    `🧾 Yakunlangan to'y — ${a.name}\n` +
    `📅 ${a.date} · ${a.guests} mehmon\n` +
    `———\n` +
    `Kelishilgan summa: ${a.agreed}\n` +
    `Olingan pul: ${a.collected}\n` +
    (a.debt ? `Qarzdorlik: ${a.debt}\n` : '') +
    `Xarajatlar: ${a.expenses}\n` +
    `Qolgan (foyda): ${a.profit}`,
  eventCard: "To'y kartasi",
  archiveEmpty: "Arxiv bo'sh — hali yakunlangan to'y yo'q.",
  archive: (
    count: number,
    rows: string,
    collected: string,
    spent: string,
    left: string,
  ) =>
    `🗂 To'ylar arxivi · ${count} ta yakunlangan to'y\n\n${rows}\n\n` +
    `Jami olingan: ${collected}\nJami xarajat: ${spent}\nJami qolgan: ${left}`,

  // Shopping lists and the store
  openLists: 'Bozorlikni ochish',
  listHead: (event: string | null, chef: string) =>
    `${event ?? "To'ysiz ro'yxat"}\nOshpaz: ${chef}`,
  added: " (qo'shildi)",
  chefQty: (qty: string) => ` (oshpaz: ${qty})`,
  purchased: (head: string, rows: string, total: string, toWedding: boolean) =>
    `💰 Bozorlik xarid qilindi\n\n${head}\n\n${rows}\n\nJami: ${total}` +
    (toWedding ? "\nBu summa to'yning xarajatlariga o'zi yozildi." : ''),
  stockUsage: (event: string, chef: string, rows: string, cost: string) =>
    `📦 Ombordan shu to'yga olingan mahsulotlar\n\n${event}\nOshpaz: ${chef}\n\n${rows}\n\n${cost}`,
  stockNoPrice: 'Narxi: omborda bu mahsulotlarga narx kiritilmagan',
  stockTotal: (total: string, unpriced: number) =>
    `Jami: ${total}` +
    (unpriced > 0 ? ` (${unpriced} ta mahsulot narxsiz)` : ''),
  returned: (by: string) => `↩️ Bu mahsulotlar omborga qaytarildi (${by}).`,
};

export type BotText = typeof uz;

const ru: BotText = {
  som: 'сум',
  units: { KG: 'кг', LITER: 'л', DONA: 'шт.' },
  and: 'и',
  more: (n) => `… и ещё ${n}`,
  guests: (n) => `гостей: ${n}`,

  commands: {
    toylar: 'Ближайшие свадьбы',
    tekshir: 'Проверить напоминания сейчас',
    ombor: 'Товары, которых мало на складе',
    hisobot: 'Отчёт (PDF)',
    arxiv: 'Архив свадеб (PDF)',
    toy: 'Расходы одной свадьбы — PDF для клиента',
    chiqish: 'Отключить бота',
  },
  startCommand: 'Подключить бота',
  commandsHeader: 'Команды:',
  menuButton: 'Приложение',
  homeChef: '📱 Страница повара',
  homeStaff: '📱 Открыть приложение',
  reportTitles: { ACCOUNTING: '📊 Отчёт', ARCHIVE: '🗂 Архив' },
  weddingButton: '🧾 Расходы свадьбы',
  periods: {
    THIS_MONTH: 'Этот месяц',
    LAST_MONTH: 'Прошлый месяц',
    THIS_YEAR: 'Этот год',
    ALL: 'За всё время',
  },

  welcome:
    'Здравствуйте! Этот бот для сотрудников тойханы.\n\n' +
    'Проще всего подключиться так: откройте на сайте страницу «Профиль» и нажмите «Подключить Telegram-бот».\n\n' +
    'Или отправьте сюда номер телефона, с которым входите в систему (например, +998901234567).',
  askPhone:
    'Отправьте номер телефона, с которым входите в систему (например, +998901234567), или нажмите кнопку ниже.',
  sharePhone: '📱 Отправить номер',
  badPhone: 'Неверный номер телефона. Например: +998901234567',
  phoneUnknown:
    'Этот номер не зарегистрирован в системе как повар или администратор. Супер-админ уведомлён.',
  phoneUnknownAlert: (phone, who) =>
    `⚠️ Попытка входа в бот без доступа.\n\nНомер: ${phone}\nTelegram: ${who || 'неизвестно'}\n\nЭтого номера нет в базе среди поваров и администраторов.`,
  askPin: 'Теперь введите 4-значный PIN-код, с которым входите в систему.',
  askPassword: 'Теперь введите пароль, с которым входите в систему.',
  codeWrong: (message) =>
    `${message || 'Неверный код'}\n\nВведите ещё раз или начните заново с /start.`,
  linkedNow: (name, about, commands) =>
    `✅ ${name}, бот подключён.\n\n${about}\n\n${commands}`,
  aboutChef: (times) =>
    `Если на завтрашние свадьбы не написан список закупки, в ${times} придёт напоминание.`,
  aboutSuperAdmin: (times) =>
    `Сюда будут приходить уведомления, когда повар отправит закупку и когда свадьба завершится. О непросмотренных списках бот напомнит в ${times}.`,
  aboutOther: 'Отсюда приложение открывается без логина и пароля.',
  alreadyLinked: (name, commands) =>
    `${name}, вы уже подключены.\n\n${commands}`,
  linkExpired:
    'Ссылка устарела или уже использована. Нажмите «Подключить Telegram-бот» на странице «Профиль» ещё раз.',
  unlinked:
    'Бот отключён от вашего аккаунта. Чтобы подключить снова, нажмите /start.',
  unlinkedFromProfile:
    'Бот отключён от аккаунта через профиль. Чтобы подключить снова, нажмите «Подключить Telegram-бот» на странице «Профиль».',
  linkFirst: 'Сначала подключите бота к аккаунту: /start',
  startFirst: 'Чтобы начать, нажмите /start.',
  languageChanged: 'Теперь бот пишет на русском.',

  denied: 'Эта команда вам недоступна.',
  deniedStock: 'Данные склада вам недоступны.',
  deniedFinance: 'Отчёты доступны только супер-админу.',

  reportKeyboardHint: 'Чтобы получать отчёты в PDF, пользуйтесь кнопками ниже.',
  reportPeriod: (title) => `${title} — за какой период нужен PDF?`,
  preparing: 'Готовим отчёт…',
  reportFailed: 'Не удалось подготовить отчёт, попробуйте чуть позже.',
  noPastWeddings: 'Прошедших свадеб пока нет.',
  weddingPicker:
    '🧾 Расходы какой свадьбы нужны? (чтобы показать клиенту, без цен на продукты)',

  noUpcoming: 'В ближайшие дни свадеб нет.',
  upcomingTitle: '📅 Ближайшие свадьбы',
  upcomingRow: (date, time, name, guests) =>
    `• ${date}, ${time} — ${name}, гостей: ${guests}`,
  pendingMark: ' (ожидает)',
  stockOk: 'На складе всего достаточно — ниже порога ничего нет.',
  lowStockTitle: '📦 Товары, которых мало на складе',
  lowStockRow: (name, qty, min, unit) =>
    `• ${name} — осталось ${qty} ${unit} (порог: ${min} ${unit})`,
  storeButton: 'Склад',
  nothingChef: 'Списки закупки на завтрашние свадьбы написаны и подтверждены.',
  nothingPending: 'Пока вас ничего не ждёт.',

  remindChef: (r) =>
    `🛒 Завтра свадьба — ${r.date}, в ${r.time}\n\n` +
    `${r.name}\nгостей: ${r.guests}` +
    (r.dishes ? `\nБлюда: ${r.dishes}` : '') +
    (r.hasList
      ? '\n\nСписок закупки написан, но ещё не подтверждён — подтвердите его и отправляйтесь за покупками.'
      : '\n\nНа эту дату нужно написать список закупки.'),
  writeShopping: 'Написать закупку',
  unseenTitle: (n) => `📋 Непросмотренных списков закупки: ${n}`,
  unseenRow: (where, items, chef, bought) =>
    `• ${where} — товаров: ${items}, ${chef}${bought ? ', куплено' : ''}`,
  noEventList: 'Список без свадьбы',

  completed: (a) =>
    `🧾 Завершённая свадьба — ${a.name}\n` +
    `📅 ${a.date} · гостей: ${a.guests}\n` +
    `———\n` +
    `Договорная сумма: ${a.agreed}\n` +
    `Получено: ${a.collected}\n` +
    (a.debt ? `Долг: ${a.debt}\n` : '') +
    `Расходы: ${a.expenses}\n` +
    `Остаток (прибыль): ${a.profit}`,
  eventCard: 'Карточка свадьбы',
  archiveEmpty: 'Архив пуст — завершённых свадеб пока нет.',
  archive: (count, rows, collected, spent, left) =>
    `🗂 Архив свадеб · завершено: ${count}\n\n${rows}\n\n` +
    `Всего получено: ${collected}\nВсего расходов: ${spent}\nВсего осталось: ${left}`,

  openLists: 'Открыть закупки',
  listHead: (event, chef) => `${event ?? 'Список без свадьбы'}\nПовар: ${chef}`,
  added: ' (добавлено)',
  chefQty: (qty) => ` (повар: ${qty})`,
  purchased: (head, rows, total, toWedding) =>
    `💰 Закупка сделана\n\n${head}\n\n${rows}\n\nИтого: ${total}` +
    (toWedding ? '\nЭта сумма сама записана в расходы свадьбы.' : ''),
  stockUsage: (event, chef, rows, cost) =>
    `📦 Со склада взято на эту свадьбу\n\n${event}\nПовар: ${chef}\n\n${rows}\n\n${cost}`,
  stockNoPrice: 'Цена: на складе для этих товаров цена не указана',
  stockTotal: (total, unpriced) =>
    `Итого: ${total}` + (unpriced > 0 ? ` (без цены: ${unpriced})` : ''),
  returned: (by) => `↩️ Эти товары возвращены на склад (${by}).`,
};

export const BOT_TEXT: Record<Lang, BotText> = { uz, ru };

/** Whole sums, thousands split by spaces: "45 000 000 so'm" / "45 000 000 сум". */
export function money(value: unknown, lang: Lang) {
  const n = Math.round(Number(value ?? 0))
    .toLocaleString('ru-RU')
    .replace(/\s/gu, ' ');
  return `${n} ${BOT_TEXT[lang].som}`;
}

/** "5-noyabr" / "5 ноября". */
export function dayMonth(date: Date, lang: Lang, timeZone: string) {
  if (lang === 'ru') {
    return date.toLocaleDateString('ru-RU', {
      timeZone,
      day: 'numeric',
      month: 'long',
    });
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')!.value;
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  return `${day}-${UZ_MONTHS[month - 1]}`;
}

const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

/** "18:00", 24-hour, in the hall's time zone. */
export function hourMinute(date: Date, timeZone: string) {
  return date.toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/** "05.11.2026". */
export function shortDate(date: Date, timeZone: string) {
  return date.toLocaleDateString('ru-RU', { timeZone });
}
