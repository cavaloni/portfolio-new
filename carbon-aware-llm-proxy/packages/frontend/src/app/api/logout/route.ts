import { NextResponse } from "next/server";

const AUTH_COOKIE = "demo_auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.X_FORWARDED_PROTO === "https",
    path: "/",
    maxAge: 0, // Expire immediately
  });
  return response;
}
