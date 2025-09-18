import { NextResponse } from "next/server";

// Deprecated demo endpoint. Real auth is handled by the backend at /v1/auth/*
export async function POST() {
  return NextResponse.json(
    {
      error: "DEPRECATED",
      message: "This demo login endpoint is removed. Use the real auth flow.",
    },
    { status: 410 },
  );
}

