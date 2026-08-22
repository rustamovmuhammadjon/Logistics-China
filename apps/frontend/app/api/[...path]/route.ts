import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SKIP = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "transfer-encoding",
]);

function backendOrigin() {
  const value = process.env.BACKEND_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const origin = backendOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set on Vercel. Add the Railway URL and redeploy." },
      { status: 503 }
    );
  }

  const { path } = await ctx.params;
  const target = `${origin}/api/${path.join("/")}${req.nextUrl.search}`;
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
  } catch {
    return NextResponse.json(
      { error: "Cannot reach the Railway backend. Check BACKEND_URL." },
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
