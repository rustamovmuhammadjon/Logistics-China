import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  TRUCK_DOCUMENT_MAX_BYTES,
  TRUCK_DOCUMENT_MAX_COUNT,
  TRUCK_DOCUMENT_MAX_MB,
  TRUCK_DOCUMENT_TYPES,
  truckDocumentExtension,
} from "@logistics/shared";
import { prisma } from "./prisma.js";
import { badRequest, notFound } from "./errors.js";
import { requiredString } from "./input.js";
import { getSupabaseAdmin, safeFileName } from "./supabase.js";

const ALLOWED_TYPES = Object.values(TRUCK_DOCUMENT_TYPES);
const DOWNLOAD_LINK_SECONDS = 60;

export const truckDocumentPublicSelect = {
  id: true,
  truckId: true,
  fileName: true,
  sizeBytes: true,
  contentType: true,
  uploadedByLabel: true,
  createdAt: true,
} satisfies Prisma.TruckDocumentSelect;

// Separate from the (public) photo bucket on purpose: shipping documents
// must never be reachable by a guessable or forwarded URL.
export function documentsBucket() {
  return process.env.SUPABASE_DOCUMENTS_BUCKET || "shipping-documents";
}

let bucketReady: Promise<void> | null = null;

// Size/type limits are also set on the bucket itself, so Supabase rejects
// an oversized or wrong-type upload even though the bytes never pass
// through this server.
function ensureDocumentsBucket() {
  bucketReady ??= (async () => {
    const supabase = getSupabaseAdmin();
    const bucket = documentsBucket();
    const options = { public: false, fileSizeLimit: TRUCK_DOCUMENT_MAX_BYTES, allowedMimeTypes: ALLOWED_TYPES };
    const { data: existing } = await supabase.storage.getBucket(bucket);
    const { error } = existing
      ? await supabase.storage.updateBucket(bucket, options)
      : await supabase.storage.createBucket(bucket, options);
    if (error && !error.message.toLowerCase().includes("already exists")) throw new Error(error.message);
  })().catch((err) => {
    bucketReady = null;
    throw err;
  });
  return bucketReady;
}

function storage() {
  return getSupabaseAdmin().storage.from(documentsBucket());
}

function assertAllowedFile(fileName: string) {
  const ext = truckDocumentExtension(fileName);
  if (!ext) badRequest("Only PDF or Word files (.pdf, .doc, .docx) can be uploaded");
  return ext;
}

function assertWithinSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) badRequest("This file is empty");
  if (sizeBytes > TRUCK_DOCUMENT_MAX_BYTES) badRequest(`Each document must be ${TRUCK_DOCUMENT_MAX_MB} MB or smaller`);
}

async function assertRoomForAnother(truckId: string, db: Prisma.TransactionClient = prisma) {
  const count = await db.truckDocument.count({ where: { truckId } });
  if (count >= TRUCK_DOCUMENT_MAX_COUNT) {
    badRequest(`A truck can have at most ${TRUCK_DOCUMENT_MAX_COUNT} documents. Delete one to upload another.`);
  }
}

function truckPrefix(truckId: string) {
  return `trucks/${truckId}/`;
}

export async function createDocumentUploadUrl(truckId: string, body: { fileName?: unknown; sizeBytes?: unknown }) {
  const fileName = requiredString(body.fileName, "fileName");
  assertAllowedFile(fileName);
  assertWithinSize(Number(body.sizeBytes));
  await assertRoomForAnother(truckId);
  await ensureDocumentsBucket();

  const path = `${truckPrefix(truckId)}${Date.now()}-${randomBytes(6).toString("hex")}-${safeFileName(fileName)}`;
  const { data, error } = await storage().createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message || "Could not prepare the upload");
  return { path, signedUrl: data.signedUrl };
}

// The browser has already put the bytes in storage; this checks what
// actually landed there (not what the client claimed) before recording it.
export async function finalizeDocumentUpload(params: {
  truckId: string;
  path: unknown;
  fileName: unknown;
  uploadedByUserId: string | null;
  uploadedByLabel: string;
}) {
  const path = requiredString(params.path, "path");
  const fileName = requiredString(params.fileName, "fileName").slice(0, 200);
  if (!path.startsWith(truckPrefix(params.truckId)) || path.includes("..")) badRequest("Invalid upload");
  assertAllowedFile(fileName);

  const { data: info, error } = await storage().info(path);
  if (error || !info) badRequest("The upload did not finish — try again");

  const sizeBytes = Number(info.size ?? 0);
  const contentType = String(info.contentType ?? "");
  if (sizeBytes <= 0 || sizeBytes > TRUCK_DOCUMENT_MAX_BYTES || !ALLOWED_TYPES.includes(contentType)) {
    await storage().remove([path]);
    if (sizeBytes > TRUCK_DOCUMENT_MAX_BYTES) badRequest(`Each document must be ${TRUCK_DOCUMENT_MAX_MB} MB or smaller`);
    badRequest("Only PDF or Word files (.pdf, .doc, .docx) can be uploaded");
  }

  let alreadyRecorded = false;
  try {
    return await prisma.$transaction(async (tx) => {
      // Serializes concurrent uploads to the same truck so the limit holds.
      await tx.$queryRaw`SELECT id FROM "Truck" WHERE id = ${params.truckId} FOR UPDATE`;
      const existing = await tx.truckDocument.findUnique({
        where: { storagePath: path },
        select: truckDocumentPublicSelect,
      });
      if (existing) {
        alreadyRecorded = true;
        return existing;
      }
      await assertRoomForAnother(params.truckId, tx);
      return tx.truckDocument.create({
        data: {
          truckId: params.truckId,
          fileName,
          storagePath: path,
          sizeBytes,
          contentType,
          uploadedByUserId: params.uploadedByUserId,
          uploadedByLabel: params.uploadedByLabel,
        },
        select: truckDocumentPublicSelect,
      });
    });
  } catch (err) {
    if (!alreadyRecorded) await storage().remove([path]).catch(() => undefined);
    throw err;
  }
}

export async function deleteTruckDocument(truckId: string, documentId: string) {
  const doc = await prisma.truckDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.truckId !== truckId) notFound("Document not found");
  await prisma.truckDocument.delete({ where: { id: doc.id } });
  await storage().remove([doc.storagePath]).catch(() => undefined);
}

export async function documentDownloadUrl(documentId: string, visibility: Prisma.GroupOrderWhereInput) {
  const doc = await prisma.truckDocument.findFirst({
    where: { id: documentId, truck: { subOrder: { groupOrder: visibility } } },
  });
  if (!doc) notFound("Document not found");
  const { data, error } = await storage().createSignedUrl(doc.storagePath, DOWNLOAD_LINK_SECONDS);
  if (error || !data) throw new Error(error?.message || "Could not create a download link");
  // Appended here rather than via the library's `download` option, which
  // mangles names containing spaces or "&".
  return `${data.signedUrl}&download=${encodeURIComponent(doc.fileName)}`;
}

// Hard deletes cascade the rows, but storage objects don't go with them.
export async function removeDocumentFiles(paths: string[]) {
  if (paths.length === 0) return;
  try {
    await storage().remove(paths);
  } catch {
    // Never block a delete on storage cleanup.
  }
}
