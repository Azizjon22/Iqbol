import { z } from "zod";
import {
  EVENT_EXPENSE_CATEGORIES,
  EVENT_STATUSES,
  INVENTORY_CATEGORIES,
  MENU_DISH_CATEGORIES,
  MENU_MEDIA_SECTIONS,
  MEDIA_TYPES,
  PAYMENT_METHODS,
  PRODUCT_CATEGORIES,
  TABLE_CAPACITIES,
  UNITS,
  WORKER_GENDERS,
  WORKER_POSITIONS,
} from "./enums";

const phoneRegex = /^\+?[0-9]{9,15}$/;

export const staffLoginSchema = z.object({
  phone: z.string().regex(phoneRegex, "Telefon raqami noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak"),
});
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const workerRegisterSchema = z.object({
  fullName: z.string().trim().min(3, "Ism-familiya kiritilishi shart"),
  phone: z.string().regex(phoneRegex, "Telefon raqami noto'g'ri"),
  position: z.enum(WORKER_POSITIONS),
  gender: z.enum(WORKER_GENDERS, { message: "Jinsni tanlang" }),
  photoUrl: z.string().url().optional().or(z.literal("")),
  pin: z
    .string()
    .regex(/^[0-9]{4}$/, "PIN 4 ta raqamdan iborat bo'lishi kerak")
    .optional(),
});
export type WorkerRegisterInput = z.infer<typeof workerRegisterSchema>;

export const workerLoginSchema = z.object({
  phone: z.string().regex(phoneRegex, "Telefon raqami noto'g'ri"),
  pin: z.string().regex(/^[0-9]{4}$/, "PIN 4 ta raqamdan iborat bo'lishi kerak"),
});
export type WorkerLoginInput = z.infer<typeof workerLoginSchema>;

export const createEventSchema = z.object({
  clientName: z.string().trim().min(2),
  clientPhone: z.string().regex(phoneRegex, "Telefon raqami noto'g'ri"),
  eventDate: z.coerce.date(),
  tableCapacity: z.union([z.literal(10), z.literal(12)]),
  guestCount: z.coerce.number().int().positive(),
  menuId: z.string().min(1),
  notes: z.string().optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const updateEventStatusSchema = z.object({
  status: z.enum(EVENT_STATUSES),
});

export const assignWorkerSchema = z.object({
  workerId: z.string().min(1),
  roleAtEvent: z.string().optional(),
});

export const createMenuSchema = z.object({
  name: z.string().trim().min(2),
  pricePerPerson: z.coerce.number().positive(),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  isVip: z.boolean().optional(),
});
export type CreateMenuInput = z.infer<typeof createMenuSchema>;

export const createMenuDishSchema = z.object({
  category: z.enum(MENU_DISH_CATEGORIES),
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  order: z.coerce.number().int().optional(),
});
export type CreateMenuDishInput = z.infer<typeof createMenuDishSchema>;

export const createMenuMediaSchema = z.object({
  section: z.enum(MENU_MEDIA_SECTIONS),
  mediaType: z.enum(MEDIA_TYPES),
  url: z.string().url(),
  caption: z.string().optional(),
  order: z.coerce.number().int().optional(),
});
export type CreateMenuMediaInput = z.infer<typeof createMenuMediaSchema>;

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(2),
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  productCategory: z.enum(PRODUCT_CATEGORIES).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  unit: z.enum(UNITS),
  quantity: z.coerce.number().min(0).optional(),
  minThreshold: z.coerce.number().min(0).optional(),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const createShoppingListItemSchema = z.object({
  name: z.string().trim().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.enum(UNITS),
  note: z.string().optional(),
});

export const createShoppingListSchema = z.object({
  eventId: z.string().optional(),
  items: z.array(createShoppingListItemSchema).min(1),
});
export type CreateShoppingListInput = z.infer<typeof createShoppingListSchema>;

export const markItemPurchasedSchema = z.object({
  unitPrice: z.coerce.number().min(0),
});

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const createEventExpenseSchema = z.object({
  category: z.enum(EVENT_EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
});
export type CreateEventExpenseInput = z.infer<typeof createEventExpenseSchema>;

export const tableCapacitySchema = z.enum(
  TABLE_CAPACITIES.map(String) as [string, ...string[]]
);
