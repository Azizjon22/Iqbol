import type { Menu } from "@/lib/types";

export interface ReadinessCheck {
  key: string;
  label: string;
  /** 0..1 — partial credit, e.g. 9 of 13 dishes have a photo. */
  score: number;
  weight: number;
  hint?: string;
  tab?: "dishes" | "gallery" | "info";
}

// The courses a client expects to see on any wedding menu.
const CORE_CATEGORIES = ["SALAD", "FIRST_DISH", "SECOND_DISH", "DESSERT", "DRINK"] as const;

/**
 * How presentable a menu is to a client, with what's still missing — drives
 * the readiness ring on the list and the checklist in the editor.
 */
export function menuReadiness(menu: Menu, broken: Set<string>) {
  const dishes = menu.dishes;
  const photos = menu.media.filter((m) => m.mediaType === "PHOTO");
  const coverOk = !!menu.coverImageUrl && !broken.has(menu.coverImageUrl);

  const withPhoto = dishes.filter((d) => d.photoUrl && !broken.has(d.photoUrl));
  const uniquePhotos = new Set(withPhoto.map((d) => d.photoUrl)).size;
  // Placeholder stock photos reused across many dishes don't count twice.
  const photoScore = dishes.length === 0 ? 0 : Math.min(withPhoto.length, uniquePhotos) / dishes.length;
  const sharedPhotoDishes = withPhoto.length - uniquePhotos;

  const missingCourses: string[] = CORE_CATEGORIES.filter((c) => !dishes.some((d) => d.category === c));
  const allUrls = [menu.coverImageUrl, ...dishes.map((d) => d.photoUrl), ...menu.media.map((m) => m.url)].filter(
    (u): u is string => !!u,
  );
  const brokenCount = allUrls.filter((u) => broken.has(u)).length;

  const checks: ReadinessCheck[] = [
    {
      key: "cover",
      label: "Muqova rasmi",
      score: coverOk ? 1 : 0,
      weight: 20,
      hint: !menu.coverImageUrl ? "Muqova qo'yilmagan" : !coverOk ? "Muqova rasmi ochilmayapti" : undefined,
      tab: "info",
    },
    {
      key: "description",
      label: "Tavsif",
      score: (menu.description?.trim().length ?? 0) >= 20 ? 1 : menu.description?.trim() ? 0.5 : 0,
      weight: 10,
      hint: !menu.description?.trim() ? "Mijozga qisqa tavsif yozing" : undefined,
      tab: "info",
    },
    {
      key: "courses",
      label: "Asosiy turkumlar",
      score: (CORE_CATEGORIES.length - missingCourses.length) / CORE_CATEGORIES.length,
      weight: 20,
      hint: missingCourses.length ? `${missingCourses.length} ta turkum bo'sh` : undefined,
      tab: "dishes",
    },
    {
      key: "dishPhotos",
      label: "Taom rasmlari",
      score: photoScore,
      weight: 25,
      hint:
        dishes.length - withPhoto.length > 0
          ? `${dishes.length - withPhoto.length} ta taomda rasm yo'q`
          : sharedPhotoDishes > 0
            ? `${sharedPhotoDishes + 1} ta taomda bir xil rasm`
            : undefined,
      tab: "dishes",
    },
    {
      key: "gallery",
      label: "Galereya (kamida 4 ta rasm)",
      score: Math.min(1, photos.filter((p) => !broken.has(p.url)).length / 4),
      weight: 15,
      hint: photos.length < 4 ? `Yana ${4 - photos.length} ta rasm qo'shing` : undefined,
      tab: "gallery",
    },
    {
      key: "broken",
      label: "Singan havolalar yo'q",
      score: allUrls.length === 0 ? 1 : 1 - brokenCount / allUrls.length,
      weight: 10,
      hint: brokenCount ? `${brokenCount} ta rasm ochilmayapti` : undefined,
    },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const percent = Math.round((checks.reduce((s, c) => s + c.score * c.weight, 0) / total) * 100);
  return { percent, checks, missingCourses, brokenCount };
}

export function allMenuImageUrls(menu: Menu) {
  return [
    menu.coverImageUrl,
    ...menu.dishes.map((d) => d.photoUrl),
    ...menu.media.filter((m) => m.mediaType === "PHOTO").map((m) => m.url),
  ].filter((u): u is string => !!u);
}
