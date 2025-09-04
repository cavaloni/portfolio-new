import { NextResponse } from "next/server";

const PASSWORD = "HardOnRoutly";
const AUTH_COOKIE = "demo_auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (password !== PASSWORD) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const url = new URL(next || "/", request.url);
  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "ok",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

