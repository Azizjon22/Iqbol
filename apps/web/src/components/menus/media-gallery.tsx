"use client";

import type { MenuMedia } from "@/lib/types";
import { usePick } from "@/components/i18n/use-pick";
import { PhotoTile } from "./photo-tile";
import { VideoThumbnail } from "./video-thumbnail";

export function MediaGallery({ items }: { items: MenuMedia[] }) {
  const pick = usePick();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) =>
        item.mediaType === "PHOTO" ? (
          <PhotoTile key={item.id} url={item.url} caption={pick(item.caption, item.captionRu)} />
        ) : (
          <VideoThumbnail key={item.id} url={item.url} caption={pick(item.caption, item.captionRu)} />
        ),
      )}
    </div>
  );
}
