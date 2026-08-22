"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Gallery } from "iconsax-react";
import { clientApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { MEDIA_HINT, MEDIA_MAX_BYTES, fileSizeLabel, isAllowedMedia } from "@/lib/upload-limits";

async function uploadToSupabase(file: File, kind: "media" | "avatar") {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);

  const res = await fetch("/api/uploads", {
    method: "POST",
    body,
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { publicUrl?: string; error?: string };
  if (!res.ok || !data.publicUrl) {
    throw new Error(data.error || "Upload failed");
  }
  return data.publicUrl;
}

export function MediaUploader({
  groupOrderId: _groupOrderId,
  subOrderId: _subOrderId,
  truckId,
}: {
  groupOrderId: string;
  subOrderId: string;
  truckId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        if (!isAllowedMedia(file)) {
          throw new Error(`${file.name}: use a photo or video (JPEG, PNG, WebP, MP4).`);
        }
        if (file.size > MEDIA_MAX_BYTES) {
          throw new Error(`${file.name} is ${fileSizeLabel(file.size)}. Max 4 MB per file.`);
        }
        setProgressLabel(`Uploading ${file.name}…`);
        const publicUrl = await uploadToSupabase(file, "media");
        await clientApi("/api/admin/media", {
          method: "POST",
          body: JSON.stringify({
            truckId,
            url: publicUrl,
            type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
            fileName: file.name,
          }),
        });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgressLabel(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/40">
        <Gallery size={28} color="#1d4e89" variant="Bold" />
        <span className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <Upload className="h-4 w-4" />
          {uploading ? progressLabel ?? "Uploading…" : "Drop photos or videos, or click to browse"}
        </span>
        <span className="mt-1 text-xs text-slate-400">{MEDIA_HINT}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          multiple
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </label>
      {uploading && (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export { uploadToSupabase };
