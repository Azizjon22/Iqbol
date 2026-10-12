/**
 * Files we stored ourselves, whether on disk or in the bucket.
 * The site always loads them from `/uploads/...`, which the API can read.
 * A private bucket address saved earlier is rewritten to that path.
 */
const OWNED_KEY =
  /(?:^|\/)((?:menus|workers|inventory|branding)\/[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|mov))$/i;

export function siteMediaUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  const match = OWNED_KEY.exec(url.split('?')[0]);
  if (!match) return url;
  return `/uploads/${match[1]}` as T;
}
