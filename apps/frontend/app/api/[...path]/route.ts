import { NextRequest, NextResponse } from "next/server";
import { backendOrigin } from "@/lib/backend-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SKIP = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "transfer-encoding",
  "accept-encoding",
]);

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const parsed = backendOrigin();
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 503 });
  }

  const { path } = await ctx.params;
  const target = `${parsed.origin}/api/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!SKIP.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    const cause = err instanceof Error ? err.message : "network error";
    return NextResponse.json(
      { error: `Cannot reach Railway (${parsed.origin}). ${cause}` },
      { status: 502 }
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    if (!SKIP.has(key.toLowerCase())) out.set(key, value);
  });

  const res = new NextResponse(upstream.body, { status: upstream.status, headers: out });
  const cookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) res.headers.append("Set-Cookie", cookie);
  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
