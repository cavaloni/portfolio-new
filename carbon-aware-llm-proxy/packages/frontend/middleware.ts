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

  // Simple auth logic: only bypass if explicitly disabled
  const shouldBypassAuth = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

  // Debug logging for production troubleshooting
  console.log("🔐 Auth Debug:", {
    pathname,
    shouldBypassAuth,
    disableAuth: process.env.NEXT_PUBLIC_DISABLE_AUTH,
    hasCookie: !!request.cookies.get(AUTH_COOKIE),
    cookieValue: request.cookies.get(AUTH_COOKIE)?.value,
    nodeEnv: process.env.NODE_ENV
  });

  if (shouldBypassAuth) {
    console.log("🔐 Auth bypassed for:", pathname);
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

// Protect main application routes
export const config = {
  matcher: [
    "/",
    "/chat",
    "/models",
    "/analytics",
    "/profile",
    "/settings"
  ],
};
