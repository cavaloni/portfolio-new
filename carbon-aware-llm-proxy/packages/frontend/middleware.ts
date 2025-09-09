import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge"; // Required for Vercel middleware

const AUTH_COOKIE = "demo_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debug logging for Vercel troubleshooting
  console.log("🔐 Middleware triggered for:", pathname);

  // Allow requests that should bypass auth
  const bypass = [
    "/login",
    "/api/login",
    "/api/health",
    "/api/logout",
    "/favicon.ico",
    "/robots.txt",
  ];

  if (bypass.includes(pathname)) {
    console.log("🔐 Bypassed for allowed route:", pathname);
    return NextResponse.next();
  }

  // Simple auth logic: only bypass if explicitly disabled
  const shouldBypassAuth = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

  console.log("🔐 Auth Check:", {
    pathname,
    shouldBypassAuth,
    disableAuth: process.env.NEXT_PUBLIC_DISABLE_AUTH,
    hasCookie: !!request.cookies.get(AUTH_COOKIE),
    cookieValue: request.cookies.get(AUTH_COOKIE)?.value
  });

  if (shouldBypassAuth) {
    console.log("🔐 Auth bypassed for:", pathname);
    return NextResponse.next();
  }

  // Check for valid auth cookie
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === "ok") {
    console.log("🔐 Valid cookie found, allowing:", pathname);
    return NextResponse.next();
  }

  // No valid auth - redirect to login
  console.log("🔐 No valid auth, redirecting to login from:", pathname);
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// Run middleware on all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - Next.js static files (/_next/static/*)
     * - Next.js image optimization (/_next/image/*)
     * - Next.js internals (/_next/*)
     * - Favicon
     */
    "/((?!_next/static|_next/image|_next/|favicon.ico).*)",
  ],
};
