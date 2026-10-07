"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import {
  formatDateTime,
  TRUCK_DOCUMENT_MAX_BYTES,
  TRUCK_DOCUMENT_MAX_COUNT,
  TRUCK_DOCUMENT_MAX_MB,
  TRUCK_DOCUMENT_EXTENSIONS_LABEL,
  TRUCK_DOCUMENT_KINDS_LABEL,
  TRUCK_DOCUMENT_TYPES,
  truckDocumentExtension,
  type TruckDocumentDto,
} from "@logistics/shared";
import { clientApi } from "@/lib/api";
import { fileSizeLabel } from "@/lib/upload-limits";
import { ConfirmButton } from "@/components/ConfirmButton";

const ACCEPT = Object.keys(TRUCK_DOCUMENT_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

async function downloadDocument(id: string) {
  const { url } = await clientApi<{ url: string }>(`/api/documents/${id}/download`);
  window.location.assign(url);
}

// The bytes go straight to storage on a signed URL — not through our own
// /api proxy, which runs on Vercel and can't accept bodies over 4.5 MB.
async function uploadDocument(truckUrl: string, file: File) {
  const ext = truckDocumentExtension(file.name)!;
  const { path, signedUrl } = await clientApi<{ path: string; signedUrl: string }>(
    `${truckUrl}/documents/upload-url`,
    { method: "POST", body: JSON.stringify({ fileName: file.name, sizeBytes: file.size }) }
  );

  // Typed explicitly so storage records the right MIME even when the OS
  // doesn't report one for .doc/.docx.
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", new File([file], file.name, { type: TRUCK_DOCUMENT_TYPES[ext] }));
  const put = await fetch(signedUrl, { method: "PUT", body: form });
  if (!put.ok) {
    const data = (await put.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(data.message || data.error || `Upload failed (${put.status})`);
  }

  await clientApi(`${truckUrl}/documents`, {
    method: "POST",
    body: JSON.stringify({ path, fileName: file.name }),
  });
}

function validate(files: File[], room: number) {
  if (files.length > room) {
    return room === 0
      ? `This truck already has ${TRUCK_DOCUMENT_MAX_COUNT} documents. Delete one to upload another.`
      : `You can add ${room} more document${room === 1 ? "" : "s"} (max ${TRUCK_DOCUMENT_MAX_COUNT} per truck).`;
  }
  for (const file of files) {
    if (!truckDocumentExtension(file.name)) {
      return `${file.name}: only ${TRUCK_DOCUMENT_KINDS_LABEL} files (${TRUCK_DOCUMENT_EXTENSIONS_LABEL}).`;
    }
    if (file.size === 0) return `${file.name} is empty.`;
    if (file.size > TRUCK_DOCUMENT_MAX_BYTES) {
      return `${file.name} is ${fileSizeLabel(file.size)}. Max ${TRUCK_DOCUMENT_MAX_MB} MB per document.`;
    }
  }
  return null;
}

/**
 * `truckUrl` (the operator's truck API path) turns on upload/delete;
 * without it the list is read-only. Everyone gets download.
 */
export function TruckDocuments({
  documents,
  truckUrl,
  compact = false,
}: {
  documents: TruckDocumentDto[];
  truckUrl?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const room = TRUCK_DOCUMENT_MAX_COUNT - documents.length;

  if (compact && documents.length === 0) return null;

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0 || !truckUrl) return;
    const problem = validate(files, room);
    if (problem) {
      setError(problem);
      return;
    }
    await run("upload", async () => {
      try {
        for (const file of files) {
          setBusy(`Uploading ${file.name}…`);
          await uploadDocument(truckUrl, file);
        }
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">Shipping documents</p>
          <span className="text-xs text-slate-400">
            {documents.length}/{TRUCK_DOCUMENT_MAX_COUNT}
          </span>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-xs text-slate-400">No documents yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs ring-1 ring-slate-200"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{doc.fileName}</span>
                  {!compact && (
                    <span className="block text-slate-400">
                      {fileSizeLabel(doc.sizeBytes)} · {formatDateTime(doc.createdAt)}
                      {doc.uploadedByLabel ? ` · ${doc.uploadedByLabel}` : ""}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={busy !== null}
                  onClick={() => run(`download-${doc.id}`, () => downloadDocument(doc.id))}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                {truckUrl && (
                  <ConfirmButton
                    confirmText={`Delete "${doc.fileName}"? Everyone will lose access to it.`}
                    className="text-red-500 hover:text-red-700"
                    disabled={busy !== null}
                    onConfirm={() =>
                      run(`delete-${doc.id}`, async () => {
                        await clientApi(`${truckUrl}/documents/${doc.id}`, { method: "DELETE" });
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ConfirmButton>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {truckUrl && room > 0 && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white px-3 py-3 text-center text-xs text-slate-600 hover:border-brand-400">
          <Upload className="h-4 w-4" />
          {busy?.startsWith("Uploading")
            ? busy
            : `Upload ${TRUCK_DOCUMENT_KINDS_LABEL} · max ${TRUCK_DOCUMENT_MAX_MB} MB each · ${room} left`}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            disabled={busy !== null}
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
        </label>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
