import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function resolve_admin_origin() {
  const raw_value =
    process.env.ADMIN_ORIGIN || process.env.NEXT_PUBLIC_ADMIN_ORIGIN || "";
  const normalized_value = String(raw_value || "").trim();
  if (!normalized_value) {
    return null;
  }

  const with_protocol =
    normalized_value.startsWith("http://") ||
    normalized_value.startsWith("https://")
      ? normalized_value
      : `https://${normalized_value}`;

  try {
    return new URL(with_protocol);
  } catch {
    return null;
  }
}

function is_internal_asset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function is_admin_path(pathname: string) {
  return pathname === "/access" || pathname.startsWith("/access/");
}

function resolve_request_host(request: NextRequest) {
  const forwarded_host = String(
    request.headers.get("x-forwarded-host") || "",
  )
    .split(",")[0]
    .trim();
  if (forwarded_host) {
    return forwarded_host.toLowerCase();
  }
  return String(request.headers.get("host") || "").trim().toLowerCase();
}

export function proxy(request: NextRequest) {
  const admin_origin = resolve_admin_origin();
  if (!admin_origin) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (is_internal_asset(pathname)) {
    return NextResponse.next();
  }

  const request_host = resolve_request_host(request);
  const admin_host = admin_origin.host.toLowerCase();
  const is_admin_host = request_host === admin_host;

  if (is_admin_host && (pathname === "/access" || pathname === "/access/")) {
    const rewrite_url = request.nextUrl.clone();
    rewrite_url.pathname = "/access/admin/menu";
    return NextResponse.rewrite(rewrite_url);
  }

  if (!is_admin_host && is_admin_path(pathname)) {
    const redirect_url = request.nextUrl.clone();
    redirect_url.protocol = admin_origin.protocol;
    redirect_url.host = admin_origin.host;
    redirect_url.pathname = "/access";
    redirect_url.search = search;
    return NextResponse.redirect(redirect_url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
