"use client";

import { useState } from "react";
import { ImageDropzone } from "./image-dropzone";
import { readMediaDimensions } from "@/lib/media-dimensions";

interface Props {
  name: string;
  label: string;
  folder: "menus" | "inventory" | "workers" | "branding";
  kind?: "image" | "video";
  accept?: string;
  required?: boolean;
  aspect?: "video" | "square";
  /** Existing file URL when editing, so the current picture shows and is kept. */
  defaultValue?: string | null;
  /** Fires with the uploaded public URL (or "" when cleared), e.g. for live previews. */
  onChange?: (url: string) => void;
  /** Folder picker plus drag-and-drop. */
  browse?: boolean;
  /** Shown under the control, for example "JPG, PNG, WebP, MP4". */
  formats?: string;
  /**
   * Below this, a warning (not a block) suggests a sharper source — this
   * slot shows the file full-bleed/large, where a low-res upload looks
   * visibly blurry after the browser scales it up.
   */
  minWidth?: number;
  minHeight?: number;
}

export function UploadField({
  name,
  label,
  folder,
  kind = "image",
  accept = "image/jpeg,image/png,image/webp",
  required,
  aspect = "video",
  defaultValue,
  onChange,
  browse,
  formats,
  minWidth,
  minHeight,
}: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [localPreview, setLocalPreview] = useState<string | undefined>();
  const [pickedKind, setPickedKind] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();

  async function handleFile(file: File) {
    const contentType = contentTypeOf(file);
    const allowed = new Set(accept.split(",").map((item) => item.trim()));
    if (!contentType || !allowed.has(contentType)) {
      setPickedKind(null);
      setLocalPreview(undefined);
      setError("Bu format saqlanmaydi");
      return;
    }
    setError(undefined);
    setWarning(undefined);
    setPickedKind(contentType.startsWith("video/") ? "video" : "image");
    setLocalPreview(URL.createObjectURL(file));

    if (minWidth && minHeight) {
      const dims = await readMediaDimensions(file);
      if (dims && (dims.width < minWidth || dims.height < minHeight)) {
        setWarning(
          `Diqqat: bu fayl ${dims.width}x${dims.height} o'lchamda — katta ekranda xira ko'rinishi mumkin. Kamida ${minWidth}x${minHeight} tavsiya etiladi.`,
        );
      }
    }

    setUploading(true);
    try {
      const presignRes = await fetch("/api/proxy/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, contentType }),
      });
      if (!presignRes.ok) throw new Error("Yuklashga ruxsat olinmadi");
      const { uploadUrl, publicUrl } = (await presignRes.json()) as { uploadUrl: string; publicUrl: string };

      const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
      if (!putRes.ok) throw new Error("Yuklashda xatolik yuz berdi");

      setUrl(publicUrl);
      onChange?.(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      setPickedKind(null);
      setLocalPreview(undefined);
    } finally {
      setUploading(false);
    }
  }

  const previewKind: "image" | "video" =
    pickedKind ?? (/\.(?:mp4|mov)(?:$|\?)/i.test(url) ? "video" : kind);

  return (
    <div>
      <input type="hidden" name={name} value={url} required={required} />
      <ImageDropzone
        label={label}
        kind={previewKind}
        accept={accept}
        aspect={aspect}
        previewUrl={url || localPreview}
        uploading={uploading}
        error={error}
        warning={warning}
        browse={browse}
        formats={formats}
        onFileSelected={handleFile}
        onClear={() => {
          setUrl("");
          setPickedKind(null);
          onChange?.("");
          setLocalPreview(undefined);
          setWarning(undefined);
        }}
      />
      {/* Phone videos (HEVC .mov) often show a black preview here; the server
          converts them for every browser, so the upload did work. */}
      {url && previewKind === "video" && !uploading && !error && (
        <p className="mt-1.5 text-xs text-success">
          Video yuklandi — barcha qurilmalar uchun tayyorlanmoqda (1–2 daqiqa). Saqlashingiz mumkin.
        </p>
      )}
    </div>
  );
}

function contentTypeOf(file: File): string | null {
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp" ||
    file.type === "video/mp4" ||
    file.type === "video/quicktime"
  ) {
    return file.type;
  }
  if (file.type === "video/mov") return "video/quicktime";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  if (/\.mp4$/i.test(file.name)) return "video/mp4";
  if (/\.mov$/i.test(file.name)) return "video/quicktime";
  return null;
}
