// Health check endpoint for the frontend
// Used by Docker health checks and monitoring

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Basic health check - can be extended with more comprehensive checks
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "carbon-aware-llm-frontend",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    const errorData = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      service: "carbon-aware-llm-frontend",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(errorData, { status: 503 });
  }
}
