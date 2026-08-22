export const AVATAR_MAX_MB = 4;
export const AVATAR_MAX_BYTES = AVATAR_MAX_MB * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const AVATAR_HINT = `JPEG, PNG or WebP · max ${AVATAR_MAX_MB} MB`;

export const MEDIA_MAX_MB = 4;
export const MEDIA_MAX_BYTES = MEDIA_MAX_MB * 1024 * 1024;
export const MEDIA_HINT = `Photos and videos · JPEG, PNG, WebP, MP4 · max ${MEDIA_MAX_MB} MB each`;

export function isAllowedImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
}

export function isAllowedMedia(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

export function fileSizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function prepareAvatarFile(file: File): Promise<File> {
  if (!isAllowedImage(file)) {
    throw new Error(`Use a JPEG, PNG or WebP image (max ${AVATAR_MAX_MB} MB).`);
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error(`This photo is ${fileSizeLabel(file.size)}. Choose one under 20 MB.`);
  }
  if (file.size <= AVATAR_MAX_BYTES && file.type === "image/jpeg") return file;

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1200;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this image. Try JPEG or PNG.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error("Could not process this image."))), "image/jpeg", 0.85);
  });

  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error(`This photo is still over ${AVATAR_MAX_MB} MB after resize. Pick a smaller image.`);
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}
