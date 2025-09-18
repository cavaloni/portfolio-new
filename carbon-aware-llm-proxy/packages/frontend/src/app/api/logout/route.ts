import { NextResponse } from "next/server";

// Deprecated demo endpoint. Real logout is handled by the backend at POST /v1/auth/logout
export async function POST() {
  return NextResponse.json(
    {
      error: "DEPRECATED",
      message: "This demo logout endpoint is removed. Use the real auth flow.",
    },
    { status: 410 },
  );
}
