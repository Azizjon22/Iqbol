"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useRef, useState, DragEvent } from "react";
import { FolderOpen, ImageOff, ImagePlus, Loader2, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  kind?: "image" | "video";
  accept: string;
  previewUrl?: string;
  uploading?: boolean;
  error?: string;
  onFileSelected: (file: File) => void;
  onClear?: () => void;
  className?: string;
  aspect?: "video" | "square";
  /** Shows a folder picker next to drag-and-drop upload. */
  browse?: boolean;
  /** Allowed formats, shown under the control. */
  formats?: string;
}

export function ImageDropzone({
  label,
  kind = "image",
  accept,
  previewUrl,
  uploading,
  error,
  onFileSelected,
  onClear,
  className,
  aspect = "video",
  browse,
  formats,
}: Props) {
  const tr = useTr();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [brokenUrl, setBrokenUrl] = useState<string | undefined>();
  const previewBroken = !!previewUrl && brokenUrl === previewUrl;

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className={className}>
      <p className="mb-1.5 block text-sm font-medium text-foreground">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "group relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          aspect === "square" ? "aspect-square max-w-40" : "aspect-video",
          isDragging ? "border-primary bg-primary/5" : "border-input bg-muted/40 hover:bg-muted",
          previewUrl && "border-solid border-border",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {previewUrl ? (
          <>
            {kind === "image" ? (
              previewBroken ? (
                <span className="flex flex-col items-center gap-1.5 px-4 text-center text-xs text-destructive">
                  <ImageOff className="h-6 w-6" />
                  Hozirgi rasm ochilmayapti — yangisini yuklang
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="h-full w-full object-cover" onError={() => setBrokenUrl(previewUrl)} />
              )
            ) : (
              <video src={previewUrl} className="h-full w-full object-cover" muted playsInline />
            )}
            {!uploading && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                <span className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground">
                  Almashtirish
                </span>
                {onClear && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-destructive"
                    aria-label={tr("O'chirish")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 text-center text-muted-foreground">
            {kind === "image" ? <ImagePlus className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            <span className="text-xs">
              {browse ? (
                tr("Yuklash: faylni shu yerga tashlang")
              ) : (
                <>
                  {tr("Rasmni shu yerga tashlang yoki")} <span className="font-medium text-primary">{tr("tanlash uchun bosing")}</span>
                </>
              )}
            </span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      {(browse || formats) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {browse && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-input px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <FolderOpen className="h-4 w-4" /> {tr("Papkani tanlash")}
            </button>
          )}
          {formats && <p className="text-xs text-muted-foreground">{tr("Formatlar:")} {formats}</p>}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{tr(error)}</p>}
    </div>
  );
}
