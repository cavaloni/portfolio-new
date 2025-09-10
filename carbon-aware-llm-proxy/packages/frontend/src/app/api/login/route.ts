import { NextResponse } from "next/server";

const PASSWORD = "HardOnRoutly";
const AUTH_COOKIE = "demo_auth";

export async function POST(request: Request) {
  console.log("🔐 Login API called");

  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  console.log("🔐 Login attempt:", { password: password ? "***" : "", next, nodeEnv: process.env.NODE_ENV });

  if (password !== PASSWORD) {
    console.log("🔐 Login failed: wrong password");
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  console.log("🔐 Login successful, redirecting to:", next);
  const url = new URL(next || "/", request.url);

  // Determine whether to set the cookie as Secure
  // - Always secure in production
  // - In dev, secure only when the request is effectively over HTTPS
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = new URL(request.url).protocol === "https:" || forwardedProto === "https";
  const secure = process.env.NODE_ENV === "production" ? true : isHttps;

  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "ok",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

