# Iqbol — To'yxona boshqaruv tizimi

Monorepo: `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js 16),
`packages/shared` (umumiy TypeScript turlari va zod sxemalari).

## Talablar

- Node.js 22+
- pnpm (`corepack enable && corepack prepare pnpm@9 --activate`, yoki `npm i -g pnpm`)
- Docker (lokal PostgreSQL uchun)

## Birinchi marta ishga tushirish

```bash
pnpm install

# Postgres'ni ko'tarish (5437-portda, Shodiyora 5436 da qoladi)
docker compose up -d

# .env fayllarni sozlash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# apps/web/.env.local ichidagi SESSION_SECRET'ni generatsiya qiling:
#   openssl rand -base64 32

# Umumiy paketni build qilish
pnpm --filter @iqbol/shared build

# Prisma sxema va boshlang'ich ma'lumotlar
pnpm --filter @iqbol/api prisma:generate
pnpm --filter @iqbol/api prisma:migrate
pnpm --filter @iqbol/api prisma:seed
```

### Yangilanishni olgandan keyin (`git pull`)

Loyiha avval o'rnatilgan bo'lsa, har `git pull` dan keyin:

```bash
git pull origin dev
pnpm install                                # yangi paketlar
pnpm --filter @iqbol/shared build           # umumiy paket o'zgargan bo'lishi mumkin
pnpm --filter @iqbol/api prisma:generate
pnpm --filter @iqbol/api prisma:deploy      # yangi migratsiyalar; mavjud ma'lumot o'chmaydi
```

So'ng API va web'ni qayta ishga tushiring. Yuklangan videolarni qotmaydigan
qilib qayta ishlash uchun kompyuterda `ffmpeg` bo'lishi kerak
(`sudo apt install ffmpeg`); u bo'lmasa video o'zgarishsiz saqlanadi.

Lokal seed demo ma'lumotlar yaratadi: `super_admin` (telefon `+998900000000`,
parol `Iqbol2024!`), admin, zavzal, oshpazlar va namunaviy to'ylar. Bu hisoblar
faqat ishlab chiqish uchun.

**Serverga qo'yish** alohida yo'riqnomada: [DEPLOY.md](DEPLOY.md). Productionda
seed demo hisob va to'ylarni yaratmaydi — faqat bitta super admin (parolni
birinchi kirishda almashtirish majburiy), to'yxona menyulari, idishlar va
mahsulotlar katalogi.

## Ishga tushirish (development)

```bash
pnpm dev:api   # http://localhost:3011/api
pnpm dev:web   # http://localhost:3010
```

## Fayl (rasm/video) yuklash — Cloudflare R2

`apps/api/.env` ichida `S3_*` o'zgaruvchilarni to'ldiring (R2 bucket,
access key, `S3_PUBLIC_BASE_URL` — bucket'ning ommaviy domeni). R2 bucket'da
CORS sozlamasida `apps/web` domenidan (dev'da `http://localhost:3010`)
to'g'ridan-to'g'ri `PUT` so'rovlariga ruxsat berilishi kerak, chunki rasm/video
brauzerdan bevosita R2'ga (presigned URL orqali) yuklanadi.

## Arxitektura qisqacha

- **Backend** (`apps/api`): rol-asosli ruxsat (`SUPER_ADMIN`, `ADMIN`, `ZAVZAL`),
  JWT access+refresh token, barcha CRUD modullar (`workers`, `events`, `menus`,
  `inventory`, `shopping-lists`, `payments`, `dashboard`, `uploads`).
- **Frontend** (`apps/web`): Next.js App Router, Server Actions orqali
  mutatsiyalar, `src/lib/session.ts` orqali shifrlangan httpOnly sessiya
  cookie'si, `src/proxy.ts` orqali rol-asosli marshrut himoyasi,
  `src/app/api/proxy/[...path]` orqali client komponentlar uchun autentifikatsiya
  qilingan API proxy.
- **Ma'lumotlar bazasi**: PostgreSQL + Prisma (`apps/api/prisma/schema.prisma`).

## Foydali buyruqlar

```bash
pnpm --filter @iqbol/api prisma:studio   # ma'lumotlar bazasini ko'rish
pnpm build                                    # barcha paketlarni build qilish
```
