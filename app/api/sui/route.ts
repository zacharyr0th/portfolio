import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { chainInfo } from "@/lib/chains/config";

// Security headers
const corsHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

// Rate limiting
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const requestTimestamps: number[] = [];

function canMakeRequest(): boolean {
  const now = Date.now();
  // Remove timestamps older than the window
  while (
    requestTimestamps.length > 0 &&
    requestTimestamps[0]! < now - RATE_LIMIT_WINDOW
  ) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length < MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: Request) {
  try {
    if (!canMakeRequest()) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { ...corsHeaders, "Retry-After": "60" } },
      );
    }

    requestTimestamps.push(Date.now());

    const body = await request.json();
    const { method, params } = body;

    if (!method) {
      throw new Error("No method specified");
    }

    // Use the RPC URL from chain config
    const rpcUrl = chainInfo.sui.rpcEndpoint;
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: params || [],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429, headers: { ...corsHeaders, "Retry-After": "2" } },
        );
      }
      throw new Error(`Sui API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Sui RPC error");
    }

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Unknown error occurred");
    logger.error("Error in Sui API route:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
