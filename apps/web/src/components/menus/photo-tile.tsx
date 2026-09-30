export function PhotoTile({ url, caption }: { url: string; caption?: string | null }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={caption ?? ""}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {caption && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {caption}
        </span>
      )}
    </div>
  );
}
