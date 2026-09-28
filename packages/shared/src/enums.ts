export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "ZAVZAL"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const WORKER_POSITIONS = [
  "WAITER_MALE",
  "WAITER_FEMALE",
  "CHEF",
  "OTHER",
] as const;
export type WorkerPosition = (typeof WORKER_POSITIONS)[number];

export const WORKER_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export const WORKER_GENDERS = ["MALE", "FEMALE"] as const;
export type WorkerGender = (typeof WORKER_GENDERS)[number];

export const EVENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const MENU_DISH_CATEGORIES = [
  "SALAD",
  "FIRST_DISH",
  "SECOND_DISH",
  "FRUIT",
  "DESSERT",
  "DRINK",
  "OTHER",
] as const;
export type MenuDishCategory = (typeof MENU_DISH_CATEGORIES)[number];

export const MENU_MEDIA_SECTIONS = [
  "HALL",
  "TABLE_SETUP",
  "KORTEJ",
  "PHOTOGRAPHER",
  "OTHER",
] as const;
export type MenuMediaSection = (typeof MENU_MEDIA_SECTIONS)[number];

export const MEDIA_TYPES = ["PHOTO", "VIDEO"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const UNITS = ["KG", "LITER", "DONA"] as const;
export type Unit = (typeof UNITS)[number];

export const INVENTORY_CATEGORIES = ["DISHWARE", "PRODUCT"] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const PRODUCT_CATEGORIES = [
  "VEGETABLE",
  "FRUIT",
  "MEAT",
  "DAIRY",
  "GREENS",
  "GRAIN",
  "OIL",
  "SPICE",
  "DRINK",
  "OTHER",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const INVENTORY_TXN_TYPES = ["IN", "OUT"] as const;
export type InventoryTxnType = (typeof INVENTORY_TXN_TYPES)[number];

export const SHOPPING_LIST_STATUSES = [
  "SUBMITTED",
  "REVIEWED",
  "APPROVED",
  "PURCHASED",
  "CLOSED",
] as const;
export type ShoppingListStatus = (typeof SHOPPING_LIST_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EVENT_EXPENSE_CATEGORIES = [
  "SHOPPING",
  "CAMERAMAN",
  "ARTIST",
  "KORTEJ",
  "CHEF",
  "WAITERS",
  "ZAVZAL",
  "CARWASH",
  "OTHER",
] as const;
export type EventExpenseCategory = (typeof EVENT_EXPENSE_CATEGORIES)[number];

export const TABLE_CAPACITIES = [10, 12] as const;
export type TableCapacity = (typeof TABLE_CAPACITIES)[number];

export const STAFF_ROLE_LABELS_UZ: Record<StaffRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ZAVZAL: "Zavzal",
};

export const WORKER_POSITION_LABELS_UZ: Record<WorkerPosition, string> = {
  WAITER_MALE: "Afitsant (o'g'il)",
  WAITER_FEMALE: "Afitsant (qiz)",
  CHEF: "Oshpaz",
  OTHER: "Boshqa",
};

export const WORKER_GENDER_LABELS_UZ: Record<WorkerGender, string> = {
  MALE: "Erkak",
  FEMALE: "Ayol",
};

export const MENU_DISH_CATEGORY_LABELS_UZ: Record<MenuDishCategory, string> = {
  SALAD: "Salat",
  FIRST_DISH: "Birinchi ovqat",
  SECOND_DISH: "Ikkinchi ovqat",
  FRUIT: "Meva",
  DESSERT: "Shirinlik",
  DRINK: "Ichimlik",
  OTHER: "Boshqa",
};

export const MENU_MEDIA_SECTION_LABELS_UZ: Record<MenuMediaSection, string> = {
  HALL: "Umumiy zal",
  TABLE_SETUP: "Stol bezatilishi",
  KORTEJ: "Kortej",
  PHOTOGRAPHER: "Fotosuratchi",
  OTHER: "Boshqa",
};

export const UNIT_LABELS_UZ: Record<Unit, string> = {
  KG: "kg",
  LITER: "litr",
  DONA: "dona",
};

export const INVENTORY_CATEGORY_LABELS_UZ: Record<InventoryCategory, string> = {
  DISHWARE: "Idish-tovoq",
  PRODUCT: "Mahsulot",
};

export const PRODUCT_CATEGORY_LABELS_UZ: Record<ProductCategory, string> = {
  VEGETABLE: "Sabzavotlar",
  FRUIT: "Mevalar",
  MEAT: "Go'sht mahsulotlari",
  DAIRY: "Sut mahsulotlari",
  GREENS: "Ko'katlar",
  GRAIN: "Un-yorma mahsulotlari",
  OIL: "Yog'lar",
  SPICE: "Ziravorlar",
  DRINK: "Ichimliklar",
  OTHER: "Boshqa",
};

export const EVENT_EXPENSE_CATEGORY_LABELS_UZ: Record<EventExpenseCategory, string> = {
  SHOPPING: "Bozorlik",
  CAMERAMAN: "Kamerachi",
  ARTIST: "San'atkor",
  KORTEJ: "Kortej",
  CHEF: "Oshpazga to'lov",
  WAITERS: "Afitsantlarga to'lov",
  ZAVZAL: "Zavzalga to'lov",
  CARWASH: "Moyka",
  OTHER: "Boshqa",
};

export const STAFF_ROLE_LABELS_RU: Record<StaffRole, string> = {
  SUPER_ADMIN: "Супер Админ",
  ADMIN: "Админ",
  ZAVZAL: "Завзал",
};

export const WORKER_POSITION_LABELS_RU: Record<WorkerPosition, string> = {
  WAITER_MALE: "Официант (м)",
  WAITER_FEMALE: "Официантка (ж)",
  CHEF: "Повар",
  OTHER: "Другое",
};

export const MENU_DISH_CATEGORY_LABELS_RU: Record<MenuDishCategory, string> = {
  SALAD: "Салат",
  FIRST_DISH: "Первое блюдо",
  SECOND_DISH: "Второе блюдо",
  FRUIT: "Фрукты",
  DESSERT: "Десерт",
  DRINK: "Напиток",
  OTHER: "Другое",
};

export const MENU_MEDIA_SECTION_LABELS_RU: Record<MenuMediaSection, string> = {
  HALL: "Общий зал",
  TABLE_SETUP: "Сервировка стола",
  KORTEJ: "Кортеж",
  PHOTOGRAPHER: "Фотограф",
  OTHER: "Другое",
};

export const EVENT_EXPENSE_CATEGORY_LABELS_RU: Record<EventExpenseCategory, string> = {
  SHOPPING: "Закупки",
  CAMERAMAN: "Оператор",
  ARTIST: "Артист",
  KORTEJ: "Кортеж",
  CHEF: "Оплата повару",
  WAITERS: "Оплата официантам",
  ZAVZAL: "Оплата завзалу",
  CARWASH: "Мойка",
  OTHER: "Другое",
};
