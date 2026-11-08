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

cp deploy/.env.production.example .env.production
nano .env.production
```

`.env.production` ichida:

| O'zgaruvchi | Nima |
| --- | --- |
| `DOMAIN` | Sayt manzili, `https://`siz. Masalan `iqbol.uz` |
| `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` | Har biri alohida: `openssl rand -base64 32` |
| `SEED_SUPER_ADMIN_PHONE`, `SEED_SUPER_ADMIN_PASSWORD` | Birinchi hisob. Parol kamida 8 belgi |
| `CONTACT_PHONE` | Menyu taqdimotida ko'rinadigan telefon |

Ishga tushirish:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Birinchi yig'ish bir necha daqiqa oladi. API har ishga tushganda bazaga
yangi migratsiyalarni o'zi qo'llaydi. Kalitlar bo'sh yoki namunadagi qiymatda
qolsa, API va sayt ishga tushmaydi — bu ataylab shunday.

Boshlang'ich ma'lumotlarni yozish (bir marta):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api pnpm exec prisma db seed
```

Productionda seed:

- bitta super admin yaratadi — birinchi kirishda tizim parolni almashtirishni
  so'raydi;
- baza bo'sh bo'lsa, to'yxona menyulari, idishlar va oshpazlar bozorlik
  yozadigan mahsulotlar katalogini qo'shadi;
- demo hisoblar, demo ishchilar va demo to'ylarni **yaratmaydi**;
- qayta ishga tushirilsa, mavjud ma'lumotni o'zgartirmaydi va o'chirmaydi.

Kirgandan keyin `.env.production`dagi `SEED_SUPER_ADMIN_PASSWORD`ni o'chirib
qo'ysa bo'ladi.

Tekshirish: brauzerda `https://DOMAIN` ochiladi, login sahifasi chiqadi.

## Keyingi qadamlar (super admin)

1. Kirib, parolni almashtiring.
2. Profil sahifasida sayt nomi va logotipni kiriting.
3. Menyular bo'limida narxlarni tekshiring va namunaviy rasmlar o'rniga
   to'yxonaning o'z rasm va videolarini yuklang.
4. Xodimlar sahifasida admin va zavzal, Ishchilar sahifasida oshpaz hisoblarini
   oching. Har biriga vaqtinchalik parol/PIN berasiz, ular birinchi kirishda
   o'zinikini o'rnatadi.

## Xavfsizlik qoidalari (tizim o'zi bajaradi)

- Parol yoki PIN ketma-ket 5 marta xato kiritilsa, hisob 15 daqiqaga
  bloklanadi. Super admin yangi parol/PIN bersa, blok darhol ochiladi.
- Parol/PIN almashtirilsa, xodim o'chirilsa yoki roli o'zgarsa, uning barcha
  qurilmalardagi sessiyasi shu zahoti tugaydi.

## Rasm va videolar

- Video hajmi 200 MB gacha, rasm 80 MB gacha (MP4, MOV, JPG, PNG, WebP).
- Yuklangan video fonda avtomatik tayyorlanadi: har qanday telefon va
  brauzerda ochiladigan, darhol boshlanadigan va to'xtab qolmaydigan holatga
  keltiriladi. iPhone'ning 4K videosi 1080p ga o'tkaziladi; allaqachon mos
  bo'lgan video esa o'zgartirilmaydi (sifati aynan saqlanadi).
- Tayyorlash bir necha soniyadan bir necha daqiqagacha davom etadi (server
  kuchiga va video uzunligiga qarab). Shu paytda menyu studiyasida "Video
  tayyorlanmoqda" yozuvi turadi; mijozlar videoni tayyor bo'lgach ko'radi.
- Server tayyorlash o'rtasida qayta ishga tushsa, ish o'zi davom ettiriladi.

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
$C logs -f api
$C logs -f web
```

Server o'chib yonsa, xizmatlar o'zi qayta ko'tariladi (`restart: unless-stopped`).

## Muhim qoidalar

- **`.env.production` git'ga tushmaydi** va tushmasligi kerak. Undagi
  kalitlarni hech kimga yubormang.
- **Parol ochilib qolsa**, darhol sayt ichida almashtiring.
- **Lokal seed'dagi parollar** (`Iqbol2024!` va boshqalar) faqat ishlab chiqish
  uchun. Ular serverda hech qachon yaratilmaydi.
