import type { MenuMedia } from "@/lib/types";
import { PhotoTile } from "./photo-tile";
import { VideoThumbnail } from "./video-thumbnail";

export function MediaGallery({ items }: { items: MenuMedia[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) =>
        item.mediaType === "PHOTO" ? (
          <PhotoTile key={item.id} url={item.url} caption={item.caption} />
        ) : (
          <VideoThumbnail key={item.id} url={item.url} caption={item.caption} />
        ),
      )}
    </div>
  );
}
