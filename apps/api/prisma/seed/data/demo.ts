import type { Prisma } from '@prisma/client';
import { daysAgo, daysFromNow } from '../dates';

/** Development-only people and weddings, so every screen has something to show. */

export const DEMO_PIN = '1234';
export const DEMO_WORKER_PHOTO =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80';

export const DEMO_WORKERS: {
  fullName: string;
  phone: string;
  position: Prisma.WorkerCreateInput['position'];
  status: Prisma.WorkerCreateInput['status'];
  withPin?: boolean;
}[] = [
  {
    fullName: 'Aziz Rahimov',
    phone: '+998903010101',
    position: 'WAITER_MALE',
    status: 'APPROVED',
  },
  {
    fullName: 'Sardor Aliyev',
    phone: '+998903010102',
    position: 'WAITER_MALE',
    status: 'APPROVED',
  },
  {
    fullName: 'Bekzod Yusupov',
    phone: '+998903010103',
    position: 'WAITER_MALE',
    status: 'APPROVED',
  },
  {
    fullName: 'Madina Nazarova',
    phone: '+998903020201',
    position: 'WAITER_FEMALE',
    status: 'APPROVED',
  },
  {
    fullName: 'Nilufar Saidova',
    phone: '+998903020202',
    position: 'WAITER_FEMALE',
    status: 'APPROVED',
  },
  {
    fullName: 'Dilshoda Ergasheva',
    phone: '+998903020203',
    position: 'WAITER_FEMALE',
    status: 'PENDING',
  },
  {
    fullName: 'Olim Chef',
    phone: '+998903030301',
    position: 'CHEF',
    status: 'APPROVED',
    withPin: true,
  },
  {
    fullName: 'Karim Oshpaz',
    phone: '+998903030302',
    position: 'CHEF',
    status: 'APPROVED',
    withPin: true,
  },
  {
    fullName: 'Shoxrux Yangi',
    phone: '+998903040401',
    position: 'OTHER',
    status: 'PENDING',
  },
];

export interface DemoEventSeed {
  clientName: string;
  clientPhone: string;
  eventDate: Date;
  guestCount: number;
  tableCapacity: number;
  menuIndex: number;
  status: Prisma.EventCreateInput['status'];
  notes?: string;
  payments?: {
    amount: number;
    daysOffset: number;
    method: 'CASH' | 'CARD' | 'TRANSFER';
  }[];
  expenses?: {
    category: Prisma.EventExpenseCreateInput['category'];
    amount: number;
    note?: string;
  }[];
}

/** Dates are relative to today, so this is built on each run. */
export function demoEvents(): DemoEventSeed[] {
  return [
    {
      clientName: 'Demo: Karimovlar oilasi',
      clientPhone: '+998907001001',
      eventDate: daysAgo(45),
      guestCount: 200,
      tableCapacity: 10,
      menuIndex: 1,
      status: 'COMPLETED',
      notes: "Klassik to'y, kechki dasturxon",
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
      clientName: "Demo: Rahimovlar to'yi",
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
      clientName: "Demo: Ertangi to'y — Saidovlar",
      clientPhone: '+998907001005',
      eventDate: daysFromNow(1),
      guestCount: 220,
      tableCapacity: 10,
      menuIndex: 1,
      status: 'CONFIRMED',
      notes: "Ertaga — dashboardda ko'rinadi",
      payments: [{ amount: 18000000, daysOffset: -7, method: 'CARD' }],
      expenses: [
        { category: 'SHOPPING', amount: 2000000, note: 'Oldindan bozorlik' },
      ],
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
}
