import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { isValidAddress } from "@/lib/chains/constants";
import axios from "axios";

// Security headers
const SECURITY_HEADERS = {
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

// Route configuration
export const dynamic = "force-dynamic";
export const revalidate = 0;

// CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}

// Error response helper
const createErrorResponse = (message: string, status: number = 400) => {
  return NextResponse.json(
    { error: message },
    { status, headers: SECURITY_HEADERS },
  );
};

// Success response helper
const createSuccessResponse = (data: unknown) => {
  return NextResponse.json(data, { headers: SECURITY_HEADERS });
};

interface SeiToken {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  chain: string;
  type: string;
}

interface SeiBalance {
  token: SeiToken;
  balance: string;
  uiAmount: number;
  valueUsd: number;
}

interface SeiBalanceData {
  balances: SeiBalance[];
  prices: Record<string, { price: number; timestamp: number }>;
  totalValueUsd: number;
}

// GET handler for Sei balance requests
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return createErrorResponse("Missing required parameter: address");
    }

    if (!isValidAddress("sei", address)) {
      return createErrorResponse("Invalid Sei address format");
    }

    // Get the QuickNode endpoint from environment variables
    const quicknodeEndpoint = process.env.QUICKNODE_SEI_ENDPOINT;
    if (!quicknodeEndpoint) {
      return createErrorResponse("QuickNode endpoint not configured");
    }

    // Fetch balances using Cosmos REST API
    const response = await axios.get(
      `${quicknodeEndpoint}/cosmos/bank/v1beta1/balances/${address}`,
    );

    if (!response.data || !response.data.balances) {
      return createErrorResponse("Failed to fetch balances");
    }

    // Transform the response to match the expected format
    const transformedData = {
      tokens: {
        balances: response.data.balances.map((balance: any) => ({
          token: {
            symbol: balance.denom,
            name: balance.denom,
            decimals: 6, // Sei uses 6 decimals by default
            address: "", // Native tokens don't have addresses
            chain: "sei",
            type: "sei",
          },
          balance: balance.amount,
          uiAmount: parseFloat(balance.amount) / Math.pow(10, 6),
          valueUsd: 0, // We'll need to fetch prices separately
        })),
        prices: {},
        totalValueUsd: 0,
      },
    };

    return createSuccessResponse(transformedData);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("Sei balance API error:", err);
    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}
