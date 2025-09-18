import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge"; // Required for Vercel middleware

// Demo auth gate removed. Middleware is now a no-op to avoid blocking pages.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/|favicon.ico).*)"],
};
