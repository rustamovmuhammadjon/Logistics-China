import { NextRequest, NextResponse } from "next/server";

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

function backendOrigin() {
  let value = process.env.BACKEND_URL?.trim() ?? "";
  if (!value) {
    return { error: "BACKEND_URL is not set on Vercel. Add the Railway backend URL." };
  }

  value = value.replace(/\/$/, "").replace(/\/api$/i, "");
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: "BACKEND_URL is not a valid URL." };
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    return { error: "BACKEND_URL is localhost. On Vercel it must be your Railway public URL, like https://xxxx.up.railway.app" };
  }
  if (host.endsWith(".vercel.app")) {
    return { error: "BACKEND_URL is the Vercel site. Put the Railway backend URL instead, like https://xxxx.up.railway.app" };
  }

  return { origin: url.origin };
}

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
