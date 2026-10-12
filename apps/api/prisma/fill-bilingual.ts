import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import {
  CAPTION_RU,
  CLIENT_NAME_RU,
  DISH_UZ,
  INVENTORY_NAME_RU,
  MENU_TEXTS,
  NOTE_RU,
} from './seed/data/translations';

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const text = readFileSync(resolve(__dirname, '../.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const empty = [{ equals: null }, { equals: '' }] as const;

/** Fills the Russian column, and moves Russian text out of the Uzbek column when that is where it was stored. */
export async function fillBilingualContent(prisma: PrismaClient) {
  const menus = await prisma.menu.findMany({
    select: { id: true, name: true, nameRu: true },
  });
  for (const menu of menus) {
    const text = MENU_TEXTS.find(
      (item) => item.match.includes(menu.name) || (menu.nameRu && item.match.includes(menu.nameRu)),
    );
    if (!text) continue;
    if (menu.name === text.name && menu.nameRu === text.nameRu) continue;
    await prisma.menu.update({
      where: { id: menu.id },
      data: {
        name: text.name,
        nameRu: text.nameRu,
        description: text.description,
        descriptionRu: text.descriptionRu,
      },
    });
  }

  const dishes = await prisma.menuDish.findMany({
    select: { id: true, name: true, description: true, nameRu: true },
  });
  const uzToRu = new Map(Object.entries(DISH_UZ).map(([ru, uz]) => [uz.name, ru]));
  for (const dish of dishes) {
    const fromRussian = DISH_UZ[dish.name];
    if (fromRussian) {
      const ruDescription = dish.description?.trim() ? dish.description : null;
      await prisma.menuDish.update({
        where: { id: dish.id },
        data: {
          name: fromRussian.name,
          nameRu: dish.name,
          description:
            fromRussian.description ??
            (ruDescription === 'Без ограничений' ? 'Cheksiz' : null),
          descriptionRu: ruDescription,
        },
      });
      continue;
    }
    const russian = uzToRu.get(dish.name);
    if (russian && !dish.nameRu?.trim()) {
      await prisma.menuDish.update({
        where: { id: dish.id },
        data: { nameRu: russian },
      });
    }
  }

  for (const [caption, captionRu] of Object.entries(CAPTION_RU)) {
    await prisma.menuMedia.updateMany({
      where: { caption, OR: [{ captionRu: empty[0] }, { captionRu: empty[1] }] },
      data: { captionRu },
    });
  }

  for (const [name, nameRu] of Object.entries(INVENTORY_NAME_RU)) {
    await prisma.inventoryItem.updateMany({
      where: { name, OR: [{ nameRu: empty[0] }, { nameRu: empty[1] }] },
      data: { nameRu },
    });
    await prisma.shoppingListItem.updateMany({
      where: { name, OR: [{ nameRu: empty[0] }, { nameRu: empty[1] }] },
      data: { nameRu },
    });
  }

  for (const [clientName, clientNameRu] of Object.entries(CLIENT_NAME_RU)) {
    await prisma.event.updateMany({
      where: { clientName, OR: [{ clientNameRu: empty[0] }, { clientNameRu: empty[1] }] },
      data: { clientNameRu },
    });
  }

  for (const [note, noteRu] of Object.entries(NOTE_RU)) {
    await prisma.event.updateMany({
      where: { notes: note, OR: [{ notesRu: empty[0] }, { notesRu: empty[1] }] },
      data: { notesRu: noteRu },
    });
    await prisma.payment.updateMany({
      where: { note, OR: [{ noteRu: empty[0] }, { noteRu: empty[1] }] },
      data: { noteRu },
    });
    await prisma.eventExpense.updateMany({
      where: { note, OR: [{ noteRu: empty[0] }, { noteRu: empty[1] }] },
      data: { noteRu },
    });
  }

  await prisma.appSettings.updateMany({
    where: { OR: [{ brandNameRu: empty[0] }, { brandNameRu: empty[1] }] },
    data: { brandNameRu: 'Iqbol' },
  });
}

async function main() {
  loadEnv();
  const prisma = new PrismaClient();
  try {
    await fillBilingualContent(prisma);
    const [items, dishes, menus] = await Promise.all([
      prisma.inventoryItem.count({ where: { OR: [{ nameRu: null }, { nameRu: '' }] } }),
      prisma.menuDish.count({ where: { OR: [{ nameRu: null }, { nameRu: '' }] } }),
      prisma.menu.findMany({ select: { name: true, nameRu: true } }),
    ]);
    console.log(`Ikki til yozildi. Ombor nomi bo'sh: ${items}, taom nomi bo'sh: ${dishes}.`);
    console.log(menus.map((menu) => `${menu.name} / ${menu.nameRu ?? ''}`).join('\n'));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
