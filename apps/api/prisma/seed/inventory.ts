import { prisma } from './client';
import { DISHWARE, PRODUCT_CATALOG } from './data/inventory';

/** Development drops stock this seed no longer lists, with its history. */
async function removeUnlistedItems() {
  const keptNames = [...DISHWARE, ...PRODUCT_CATALOG].map((item) => item.name);
  await prisma.inventoryTransaction.deleteMany({
    where: { item: { name: { notIn: keptNames } } },
  });
  const removed = await prisma.inventoryItem.deleteMany({
    where: { name: { notIn: keptNames } },
  });
  return removed.count;
}

/**
 * Writes the dishware and the chefs' product catalog.
 *
 * Development resets both to this seed. Production only adds what is missing:
 * quantities the store has counted since, and items it added, stay as they are.
 */
export async function seedInventory({ production }: { production: boolean }) {
  const removedCount = production ? 0 : await removeUnlistedItems();

  for (const item of PRODUCT_CATALOG) {
    const fields = {
      unit: item.unit,
      category: 'PRODUCT' as const,
      productCategory: item.productCategory,
    };
    await prisma.inventoryItem.upsert({
      where: { name: item.name },
      create: { name: item.name, ...fields, quantity: 0, minThreshold: null },
      // Quantity is left alone: real stock lives there once purchases arrive.
      update: production ? {} : fields,
    });
  }

  for (const item of DISHWARE) {
    const fields = {
      unit: 'DONA' as const,
      category: 'DISHWARE' as const,
      quantity: item.quantity,
      productCategory: null,
      minThreshold: null,
    };
    await prisma.inventoryItem.upsert({
      where: { name: item.name },
      create: { name: item.name, ...fields },
      update: production ? {} : fields,
    });
  }

  console.log(
    `Ombor yangilandi: ${DISHWARE.length} ta idish, ${PRODUCT_CATALOG.length} ta mahsulot, ${removedCount} ta eski yozuv o'chirildi.`,
  );
}
