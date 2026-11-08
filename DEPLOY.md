# Serverga qo'yish (production)

Bu yo'riqnoma loyihani bitta Linux serverga (VPS) Docker bilan qo'yadi:
PostgreSQL, API, sayt va HTTPS beradigan Caddy. Tashqaridan faqat sayt
ko'rinadi; API va baza internetga ochilmaydi.

## Server talablari

- Ubuntu 22.04 yoki 24.04, kamida 2 GB RAM (4 GB tavsiya etiladi) va 40 GB disk.
  Rasm va videolar diskda saqlanadi, video ko'p bo'lsa disk kattaroq bo'lsin.
- Docker va Docker Compose: `curl -fsSL https://get.docker.com | sh`
- Domen. Uning DNS `A` yozuvi server IP manziliga qaratilgan bo'lishi kerak.
- 80 va 443 portlar ochiq (Caddy sertifikatni o'zi oladi va yangilaydi).

## Birinchi marta qo'yish

```bash
git clone https://github.com/Azizjon22/Iqbol.git /opt/iqbol
cd /opt/iqbol
git checkout dev

cp deploy/.env.production.example .env.production
nano .env.production
```

`.env.production` ichida:

| O'zgaruvchi | Nima |
| --- | --- |
| `DOMAIN` | Sayt manzili, `https://`siz. Masalan `iqbol.uz` |
| `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` | Har biri alohida: `openssl rand -base64 32` |
| `SEED_SUPER_ADMIN_PHONE`, `SEED_SUPER_ADMIN_PASSWORD` | Birinchi hisob. Parol kamida 8 belgi |
| `TELEGRAM_BOT_TOKEN` | @BotFather bergan token. Bo'sh qoldirilsa bot o'chiq |
| `TELEGRAM_REMINDER_TIMES` | Eslatma soatlari, masalan `09:00,20:00` (Toshkent vaqti) |
| `CONTACT_PHONE` | Menyu taqdimotida ko'rinadigan telefon |

Ishga tushirish:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Birinchi yig'ish bir necha daqiqa oladi. API har ishga tushganda bazaga
yangi migratsiyalarni o'zi qo'llaydi.

Super admin hisobini yaratish (bir marta):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api pnpm exec prisma db seed
```

Productionda seed faqat bitta super admin yaratadi: demo hisoblar ham, demo
to'ylar ham qo'shilmaydi. Birinchi kirishda tizim parolni almashtirishni
so'raydi. Shundan keyin `.env.production`dagi `SEED_SUPER_ADMIN_PASSWORD`ni
o'chirib qo'ysa bo'ladi.

Tekshirish: brauzerda `https://DOMAIN` ochiladi, login sahifasi chiqadi.

## Keyingi qadamlar (super admin)

1. Kirib, parolni almashtiring.
2. Profil sahifasida sayt nomi va logotipni kiriting.
3. Menyular bo'limida paketlarni kiriting.
4. Xodimlar sahifasida admin, zavzal va oshpaz hisoblarini oching. Har biriga
   vaqtinchalik parol/PIN berasiz, ular birinchi kirishda o'zinikini o'rnatadi.
5. Telegram botda `/start` bosib, telefon raqam va parol bilan ulaning.
   Oshpaz va admin ham shunday ulanadi.

## Zaxira nusxa

```bash
./scripts/backup.sh
```

Skript `backups/` papkasiga bazaning va barcha yuklangan fayllarning nusxasini
yozadi va 14 kundan eskilarini o'chiradi. Har kuni soat 03:00 da avtomatik
ishlashi uchun `crontab -e` ga:

```
0 3 * * * cd /opt/iqbol && ./scripts/backup.sh >> backups/backup.log 2>&1
```

`backups/` papkasini boshqa joyga ham ko'chirib turing (boshqa kompyuter yoki
bulut). Faqat shu serverning diskida turgan nusxa disk buzilganda yordam
bermaydi.

### Nusxadan tiklash

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"

# Baza (mavjud ma'lumot nusxadagisi bilan almashtiriladi)
gunzip -c backups/db_SANA.sql.gz | $C exec -T postgres psql -U iqbol iqbol

# Yuklangan fayllar
$C exec -T api tar -xzf - -C /app/apps/api < backups/uploads_SANA.tar.gz
```

## Yangilash

```bash
cd /opt/iqbol
./scripts/backup.sh
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Kuzatish

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C ps                 # hamma xizmat "running" bo'lishi kerak
$C logs -f api        # API jurnali (bot eslatmalari ham shu yerda)
$C logs -f web
```

Server o'chib yonsa, xizmatlar o'zi qayta ko'tariladi (`restart: unless-stopped`).

## Muhim qoidalar

- **Bot faqat bitta joyda ishlasin.** Bir xil token bilan serverda ham,
  o'z kompyuteringizda ham API ishga tushirilsa, xabarlar adashadi. Lokal
  test uchun @BotFather'da alohida test bot oching.
- **`.env.production` git'ga tushmaydi** va tushmasligi kerak. Undagi
  kalitlarni hech kimga yubormang.
- **Token yoki parol ochilib qolsa**, darhol almashtiring: bot tokeni
  @BotFather'da (`/mybots` → API Token → Revoke), parollar sayt ichida.
- **To'yni o'chirish.** Tasdiqlangan yoki to'lov yozilgan to'y o'chirilmaydi,
  faqat bekor qilinadi — hisob-kitob tarixi saqlanishi uchun.
