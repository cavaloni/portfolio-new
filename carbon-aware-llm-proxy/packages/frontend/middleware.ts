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
    // Exclude common static asset paths
    pathname.startsWith("/assets/")
  ) {
    return NextResponse.next();
  }

  // Check if authentication is disabled via environment variable
  // This allows disabling auth in development or staging environments
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true" ||
      process.env.NODE_ENV === "development" && process.env.FORCE_AUTH !== "true") {
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

// Protect all routes except login and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
