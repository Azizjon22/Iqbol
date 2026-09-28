"use client";

import { useState } from "react";
import { ImageDropzone } from "./image-dropzone";

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
}: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [localPreview, setLocalPreview] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleFile(file: File) {
    setError(undefined);
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const presignRes = await fetch("/api/proxy/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, contentType: file.type }),
      });
      if (!presignRes.ok) throw new Error("Yuklashga ruxsat olinmadi");
      const { uploadUrl, publicUrl } = (await presignRes.json()) as { uploadUrl: string; publicUrl: string };

      const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("Yuklashda xatolik yuz berdi");

      setUrl(publicUrl);
      onChange?.(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      setLocalPreview(undefined);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} required={required} />
      <ImageDropzone
        label={label}
        kind={kind}
        accept={accept}
        aspect={aspect}
        previewUrl={url || localPreview}
        uploading={uploading}
        error={error}
        onFileSelected={handleFile}
        onClear={() => {
          setUrl("");
          onChange?.("");
          setLocalPreview(undefined);
        }}
      />
    </div>
  );
}
