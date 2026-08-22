"use client";

import { Trash2 } from "lucide-react";
import type { MediaDto } from "@logistics/shared";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function MediaGrid({ media }: { media: MediaDto[] }) {
  const { submit, pending } = useApiSubmit();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {media.map((m) => (
        <div key={m.id} className="space-y-1">
          {m.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt={m.fileName ?? "photo"} className="h-32 w-full rounded-lg object-cover" />
          ) : (
            <video src={m.url} controls className="h-32 w-full rounded-lg" />
          )}
          <ConfirmButton
            confirmText="Delete this file?"
            className="inline-flex w-full items-center justify-center gap-1 text-xs text-red-500 hover:text-red-700"
            disabled={pending}
            onConfirm={() => submit(`/api/admin/media/${m.id}`, { method: "DELETE" })}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </ConfirmButton>
        </div>
      ))}
    </div>
  );
}
