"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createMediaAction } from "@/lib/actions/media";

export function MediaUploader({
  groupOrderId,
  subOrderId,
  truckId,
}: {
  groupOrderId: string;
  subOrderId: string;
  truckId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        setProgressLabel(`Uploading ${file.name}...`);
        const isVideo = file.type.startsWith("video/");

        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });

        await createMediaAction(groupOrderId, subOrderId, truckId, {
          url: blob.url,
          type: isVideo ? "VIDEO" : "IMAGE",
          fileName: file.name,
        });
      }
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-slate-500">{progressLabel ?? "Uploading..."}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
