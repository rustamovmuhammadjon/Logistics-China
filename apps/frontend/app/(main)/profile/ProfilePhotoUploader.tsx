"use client";

import { useRef, useState } from "react";
import { Camera } from "iconsax-react";
import { X } from "lucide-react";
import { clientApi } from "@/lib/api";
import { uploadToSupabase } from "@/components/MediaUploader";
import { Avatar } from "@/components/Avatar";
import { useRouter } from "next/navigation";
import { AVATAR_ACCEPT, AVATAR_HINT, prepareAvatarFile } from "@/lib/upload-limits";

export function ProfilePhotoUploader({
  photoUrl,
  firstName,
  lastName,
  email,
}: {
  photoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [zoomed, setZoomed] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const ready = await prepareAvatarFile(file);
      const publicUrl = await uploadToSupabase(ready, "avatar");
      await clientApi("/api/profile/photo", { method: "POST", body: JSON.stringify({ url: publicUrl }) });
      setPreview(publicUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => preview && setZoomed(true)}
        className={preview ? "cursor-zoom-in rounded-full" : "cursor-default rounded-full"}
        aria-label={preview ? "View full-size photo" : undefined}
        disabled={!preview}
      >
        <Avatar photoUrl={preview} firstName={firstName} lastName={lastName} email={email} size={72} />
      </button>
      <div>
        <label className="btn-secondary cursor-pointer">
          <Camera size={16} variant="Bold" />
          {uploading ? "Uploading…" : "Change photo"}
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">{AVATAR_HINT}</p>
        {uploading && (
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-600" />
          </div>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      {zoomed && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
