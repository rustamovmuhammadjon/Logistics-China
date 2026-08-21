"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { updateProfilePhotoAction } from "@/lib/actions/profile";
import { Avatar } from "@/app/components/Avatar";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      await updateProfilePhotoAction(blob.url);
      setPreview(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar photoUrl={preview} firstName={firstName} lastName={lastName} email={email} size={64} />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 disabled:opacity-50"
        />
        {uploading && <p className="mt-1 text-xs text-slate-500">Uploading...</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
