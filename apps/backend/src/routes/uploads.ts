import { Router } from "express";
import { randomBytes } from "node:crypto";
import multer from "multer";
import { badRequest, unauthorized } from "../lib/errors.js";
import { getSupabaseAdmin, publicObjectUrl, safeFileName, storageBucket } from "../lib/supabase.js";
import { asyncHandler } from "../middleware/errors.js";
import type { AuthedRequest } from "../middleware/auth.js";

const AVATAR_MAX_BYTES = 4 * 1024 * 1024;
const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES },
});

export const uploadsRouter = Router();

async function ensurePublicBucket() {
  const supabase = getSupabaseAdmin();
  const bucket = storageBucket();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(listError.message);
  if (!buckets?.some((item) => item.name === bucket)) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MEDIA_MAX_BYTES,
    });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(error.message);
    }
  } else {
    await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: MEDIA_MAX_BYTES,
    });
  }
  return { supabase, bucket };
}

uploadsRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    if (!isAdmin && !user) unauthorized();

    const file = req.file;
    if (!file) badRequest("Choose a file to upload");

    const kind = String(req.body?.kind ?? "media");
    const contentType = file.mimetype || "application/octet-stream";

    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      badRequest("Only image and video uploads are allowed");
    }
    if (kind === "media" && !isAdmin) unauthorized();
    if (kind === "avatar" && !user) unauthorized();
    if (kind === "avatar" && !contentType.startsWith("image/")) {
      badRequest("Profile photo must be a JPEG, PNG or WebP image");
    }
    if (kind === "avatar" && file.size > AVATAR_MAX_BYTES) {
      badRequest("Profile photo must be 4 MB or smaller");
    }

    const folder = kind === "avatar" ? "avatars" : "trucks";
    const path = `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}-${safeFileName(file.originalname)}`;
    const { supabase, bucket } = await ensurePublicBucket();

    const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes("maximum allowed size") || text.includes("exceeded")) {
        badRequest(
          kind === "avatar"
            ? "This photo is too large. Use a JPEG, PNG or WebP under 4 MB."
            : "This file is too large. Use an image or video under 50 MB."
        );
      }
      throw new Error(error.message);
    }

    res.json({ path, publicUrl: publicObjectUrl(path) });
  })
);
