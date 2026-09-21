import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendOrigin } from "@/lib/backend-origin";
import { ADMIN_COOKIE_NAME, USER_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A browser can't open a WebSocket through the [...path] HTTP proxy (it
// can't forward an upgrade handshake), so it has to connect straight to
// the backend's own origin. But the session cookie is scoped to THIS
// site's domain (Vercel) — the browser never sends it to Railway's domain
// on a direct connection. So instead of relying on cookies, we hand the
// browser the same session JWT (already sitting in its own cookie here) to
// present as a query token; the backend's /ws upgrade handler verifies it
// exactly like it verifies the cookie for ordinary HTTP requests.
export async function GET() {
  const parsed = backendOrigin();
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 503 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value ?? cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const wsUrl = `${parsed.origin.replace(/^http/i, "ws")}/ws?token=${encodeURIComponent(token)}`;
  return NextResponse.json({ wsUrl });
}
