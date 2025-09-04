import { NextResponse, NextRequest } from "next/server";

const AUTH_COOKIE = "demo_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow requests that should bypass auth
  // Note: matcher below also excludes these paths; this is an extra guard.
  const bypass = [
    "/login",
    "/api/login",
    "/api/health",
    "/favicon.ico",
    "/robots.txt",
  ];
  if (
    bypass.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/assets/")
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === "ok") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// Protect everything except static assets and the explicit bypass routes.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|api/health|api/login|login).*)",
  ],
};

