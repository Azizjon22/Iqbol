import type {
  EventExpenseCategory,
  EventStatus,
  InventoryCategory,
  MediaType,
  MenuDishCategory,
  MenuMediaSection,
  PaymentMethod,
  ProductCategory,
  ShoppingListStatus,
  Unit,
  WorkerGender,
  WorkerPosition,
  WorkerStatus,
} from "@shodiyora/shared";

export interface Menu {
  id: string;
  name: string;
  pricePerPerson: string;
  description: string | null;
  coverImageUrl: string | null;
  isVip: boolean;
  dishes: MenuDish[];
  media: MenuMedia[];
}

export interface MenuDish {
  id: string;
  menuId: string;
  category: MenuDishCategory;
  name: string;
  description: string | null;
  photoUrl: string | null;
  order: number;
}

export interface MenuMedia {
  id: string;
  menuId: string;
  section: MenuMediaSection;
  mediaType: MediaType;
  url: string;
  caption: string | null;
  order: number;
}

export interface WorkerSummary {
  id: string;
  fullName: string;
  phone: string;
  photoUrl: string | null;
  position: WorkerPosition;
  gender: WorkerGender | null;
  status: WorkerStatus;
  hasPin?: boolean;
  mustChangePin?: boolean;
  createdAt: string;
}

export interface EventAssignment {
  id: string;
  eventId: string;
  workerId: string;
  roleAtEvent: string | null;
  worker: WorkerSummary;
  assignedBy: { id: string; fullName: string };
}

export interface Payment {
  id: string;
  eventId: string;
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  note: string | null;
  createdBy?: { id: string; fullName: string };
}

export interface EventExpense {
  id: string;
  eventId: string;
  category: EventExpenseCategory;
  amount: string;
  note: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string };
}

export interface EventDetail {
  id: string;
  clientName: string;
  clientPhone: string;
  eventDate: string;
  tableCapacity: number;
  guestCount: number;
  menuId: string;
  menu: Menu;
  status: EventStatus;
  notes: string | null;
  /** The couple's chosen 1st / 2nd dish; set by SUPER_ADMIN. */
  firstDish: string | null;
  secondDish: string | null;
  assignments: EventAssignment[];
  payments?: Payment[];
  expenses?: EventExpense[];
  shoppingLists?: ShoppingList[];
  totalPrice?: string;
  paidAmount?: string;
  balance?: string;
  totalExpenses?: string;
  netProfit?: string;
}

export interface UpcomingEvent {
  id: string;
  clientName: string;
  eventDate: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  productCategory: ProductCategory | null;
  photoUrl: string | null;
  unit: Unit;
  quantity: string;
  minThreshold: string | null;
  updatedAt: string;
}

export interface InventoryTxn {
  id: string;
  itemId: string;
  type: "IN" | "OUT";
  quantity: string;
  note: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string };
  sourceShoppingListItem: {
    shoppingList: { id: string; event: { id: string; clientName: string } | null };
  } | null;
  /** Only on the store-wide recent feed. */
  item?: { id: string; name: string; unit: Unit; category: InventoryCategory };
}

export interface DailyReportDay {
  date: string;
  totalPaid: string;
  totalExpenses: string;
  netProfit: string;
  eventCount: number;
  expensesByCategory: { category: EventExpenseCategory; amount: string }[];
}

export interface DailyReport {
  days: DailyReportDay[];
  totalPaid: string;
  totalExpenses: string;
  netProfit: string;
  expensesByCategory: { category: EventExpenseCategory; amount: string }[];
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  productCategory: ProductCategory | null;
  unit: Unit;
  photoUrl: string | null;
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: string;
  /** Chef's original figure when SUPER_ADMIN changed it; "0" = added by SUPER_ADMIN. */
  originalQuantity: string | null;
  unit: Unit;
  unitPrice: string | null;
  isPurchased: boolean;
  note: string | null;
}

export interface ShoppingList {
  id: string;
  eventId: string | null;
  status: ShoppingListStatus;
  createdAt: string;
  reviewedAt: string | null;
  createdByWorker: { id: string; fullName: string; position: WorkerPosition };
  event: { id: string; clientName: string; eventDate: string; guestCount?: number } | null;
  reviewedBy: { id: string; fullName: string } | null;
  approvedAt: string | null;
  approvedBy: { id: string; fullName: string } | null;
  items: ShoppingListItem[];
}

export interface StaffUserSummary {
  id: string;
  fullName: string;
  phone: string;
  role: "SUPER_ADMIN" | "ADMIN" | "ZAVZAL";
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: string;
}
