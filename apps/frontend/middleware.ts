import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME,
  verifyAdminSessionFromToken,
  verifyUserSessionFromToken,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = await verifyAdminSessionFromToken(adminToken);

  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (isAdmin) {
    return NextResponse.next();
  }

  const userToken = request.cookies.get(USER_COOKIE_NAME)?.value;
  const viewer = await verifyUserSessionFromToken(userToken);

  if (!viewer) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/",
    "/completed",
    "/cancelled",
    "/track/:path*",
    "/dashboard/:path*",
    "/orders/:path*",
    "/employees/:path*",
    "/operators/:path*",
    "/partners/:path*",
    "/profile",
  ],
};
