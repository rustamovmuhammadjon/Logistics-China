"use client";

import { useRef, useState } from "react";
import { Camera } from "iconsax-react";
import { clientApi } from "@/lib/api";
import { uploadToSupabase } from "@/components/MediaUploader";
import { Avatar } from "@/components/Avatar";
import { useRouter } from "next/navigation";

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

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadToSupabase(file, "avatar");
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
      <Avatar photoUrl={preview} firstName={firstName} lastName={lastName} email={email} size={72} />
      <div>
        <label className="btn-secondary cursor-pointer">
          <Camera size={16} variant="Bold" />
          {uploading ? "Uploading…" : "Change photo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
        {uploading && (
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-600" />
          </div>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
