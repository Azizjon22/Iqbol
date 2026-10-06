import type { Menu } from '@prisma/client';
import { prisma } from './client';
import {
  HALL_PHOTOS,
  KORTEJ_PHOTO,
  MENU_SEEDS,
  PHOTOGRAPHER_PHOTO,
  TABLE_PHOTOS,
  type MenuSeed,
} from './data/menus';

async function upsertMenu(def: MenuSeed): Promise<Menu> {
  const fields = {
    pricePerPerson: def.pricePerPerson,
    guestCount: def.guestCount,
    description: def.description,
    isVip: def.isVip,
    coverImageUrl: def.cover,
  };
  const existing = await prisma.menu.findFirst({ where: { name: def.name } });
  return existing
    ? prisma.menu.update({ where: { id: existing.id }, data: fields })
    : prisma.menu.create({ data: { name: def.name, ...fields } });
}

/** The dish list always follows this file: it is replaced, not merged. */
async function replaceDishes(menuId: string, def: MenuSeed) {
  await prisma.menuDish.deleteMany({ where: { menuId } });
  await prisma.menuDish.createMany({
    data: def.dishes.map((dish, order) => ({
      menuId,
      category: dish.category,
      name: dish.name,
      description: dish.description,
      photoUrl: dish.photo,
      order,
    })),
  });
}

/** Placeholder gallery, only for a menu that has no media of its own yet. */
async function addPlaceholderMedia(menuId: string) {
  if ((await prisma.menuMedia.count({ where: { menuId } })) > 0) return;
  const photo = { menuId, mediaType: 'PHOTO' as const };
  await prisma.menuMedia.createMany({
    data: [
      {
        ...photo,
        section: 'HALL',
        url: HALL_PHOTOS[0],
        caption: 'Asosiy zal',
        order: 0,
      },
      {
        ...photo,
        section: 'HALL',
        url: HALL_PHOTOS[1],
        caption: 'Zal panoramasi',
        order: 1,
      },
      {
        ...photo,
        section: 'TABLE_SETUP',
        url: TABLE_PHOTOS[0],
        caption: 'Stol bezagi',
        order: 0,
      },
      {
        ...photo,
        section: 'TABLE_SETUP',
        url: TABLE_PHOTOS[1],
        caption: 'Servirovka',
        order: 1,
      },
      {
        ...photo,
        section: 'KORTEJ',
        url: KORTEJ_PHOTO,
        caption: 'Kortej',
        order: 0,
      },
      {
        ...photo,
        section: 'PHOTOGRAPHER',
        url: PHOTOGRAPHER_PHOTO,
        caption: 'Foto zona',
        order: 0,
      },
    ],
  });
}

/** Development tidies menus this seed no longer lists, moving their weddings to `fallback`. */
async function retireUnlistedMenus(fallback: Menu | undefined) {
  if (!fallback) return;
  const retired = await prisma.menu.findMany({
    where: { name: { notIn: MENU_SEEDS.map((def) => def.name) } },
    select: { id: true, name: true },
  });
  for (const old of retired) {
    await prisma.event.updateMany({
      where: { menuId: old.id },
      data: { menuId: fallback.id },
    });
    await prisma.menu.delete({ where: { id: old.id } });
    console.log(`Eski menyu olib tashlandi: ${old.name}`);
  }
}

/**
 * Writes the hall's menus and returns them in `MENU_SEEDS` order.
 *
 * Development keeps the database in step with this seed. Production only
 * fills an empty database: once menus exist, the owner's edits are never
 * overwritten or deleted.
 */
export async function seedMenus({
  production,
}: {
  production: boolean;
}): Promise<Menu[]> {
  if (production && (await prisma.menu.count()) > 0) {
    console.log('Menyular allaqachon bor — tegilmadi.');
    return [];
  }

  const menus: Menu[] = [];
  for (const def of MENU_SEEDS) {
    const menu = await upsertMenu(def);
    await replaceDishes(menu.id, def);
    await addPlaceholderMedia(menu.id);
    menus.push(menu);
  }
  if (!production) await retireUnlistedMenus(menus[0]);

  console.log(`${menus.length} ta menyu (taomlar + media) tayyor.`);
  return menus;
}
