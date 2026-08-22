import { createClient } from "@supabase/supabase-js";
import { badRequest } from "./errors.js";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

export function assertServiceRoleKey() {
  const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (key.startsWith("sb_secret_")) return key;

  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()) as { role?: string };
    if (payload.role !== "service_role") {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY has role "${payload.role}". Paste the service_role secret from Supabase → Project Settings → API. It is a long JWT that starts with eyJ.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("service_role")) throw err;
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is invalid. Open Supabase → Project Settings → API and copy the service_role key (long JWT starting with eyJ). Do not use the anon/public key or the project URL."
    );
  }
  return key;
}

export function getSupabaseAdmin() {
  return createClient(requiredEnv("SUPABASE_URL"), assertServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "logistics";
}

export function publicObjectUrl(path: string) {
  const base = requiredEnv("SUPABASE_URL").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${storageBucket()}/${path}`;
}

export function isSupabasePublicUrl(url: string) {
  try {
    const expected = new URL(requiredEnv("SUPABASE_URL"));
    const actual = new URL(url);
    return (
      actual.hostname === expected.hostname &&
      actual.pathname.startsWith(`/storage/v1/object/public/${storageBucket()}/`)
    );
  } catch {
    return false;
  }
}

export function assertSupabasePublicUrl(url: string) {
  if (!isSupabasePublicUrl(url)) {
    badRequest("Invalid media URL");
  }
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}
