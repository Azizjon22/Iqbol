/** Reads a dropped/selected image or video file's native pixel size, without uploading it. */
export function readMediaDimensions(file: File): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  const cleanup = () => URL.revokeObjectURL(url);

  if (file.type.startsWith("video/")) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        cleanup();
      };
      video.onerror = () => {
        resolve(null);
        cleanup();
      };
      video.src = url;
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      cleanup();
    };
    img.onerror = () => {
      resolve(null);
      cleanup();
    };
    img.src = url;
  });
}
