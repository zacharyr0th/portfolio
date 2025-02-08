import { NextResponse } from "next/server";
import { quicknode } from "@/lib/data/quicknode";
import { logger } from "@/lib/utils/core/logger";

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

// POST handler for QuickNode API requests
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { service, method, params } = body;

    if (!service || !method) {
      return createErrorResponse("Missing required fields: service and method");
    }

    let result;

    switch (service) {
      case "functions":
        if (!params?.functionId) {
          return createErrorResponse("Missing required field: functionId");
        }
        result = await quicknode.callFunction(params.functionId, params);
        break;

      case "ipfs":
        if (method === "upload" && !params?.file) {
          return createErrorResponse("Missing required field: file");
        }
        if (method === "get" && !params?.cid) {
          return createErrorResponse("Missing required field: cid");
        }
        result =
          method === "upload"
            ? await quicknode.uploadToIPFS(params.file)
            : await quicknode.getFromIPFS(params.cid);
        break;

      case "kv":
        if (method === "set" && (!params?.key || !params?.value)) {
          return createErrorResponse("Missing required fields: key and value");
        }
        if (method === "get" && !params?.key) {
          return createErrorResponse("Missing required field: key");
        }
        result =
          method === "set"
            ? await quicknode.kvSet(params.key, params.value)
            : await quicknode.kvGet(params.key);
        break;

      case "quickalerts":
        if (!params) {
          return createErrorResponse("Missing required field: params");
        }
        result = await quicknode.createAlert(params);
        break;

      case "streams":
        if (!params) {
          return createErrorResponse("Missing required field: params");
        }
        result = await quicknode.createStream(params);
        break;

      default:
        return createErrorResponse(`Unsupported service: ${service}`);
    }

    return createSuccessResponse(result);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("QuickNode API error:", err);
    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}

interface SeiToken {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  type?: string;
}

interface SeiBalance {
  token: SeiToken;
  balance: string;
  price?: number;
}

interface SeiBalanceResponse {
  balances: SeiBalance[];
}

// GET handler for balance endpoint
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return createErrorResponse("Missing required parameter: address");
    }

    // Fetch balances using QuickNode
    const balanceResult = (await quicknode.callFunction("sei-balance", {
      address,
    })) as { data: SeiBalanceResponse };

    // Transform the response to match the expected format
    const transformedData = {
      tokens: {
        balances: (balanceResult.data.balances || []).map(
          (balance: SeiBalance) => ({
            token: {
              symbol: balance.token.symbol,
              name: balance.token.name,
              decimals: balance.token.decimals,
              address: balance.token.address,
              chain: "sei",
              type: balance.token.type || "sei",
            },
            balance: balance.balance,
            uiAmount:
              Number(balance.balance) / Math.pow(10, balance.token.decimals),
            valueUsd:
              (Number(balance.balance) / Math.pow(10, balance.token.decimals)) *
              (balance.price || 0),
          }),
        ),
        prices: Object.fromEntries(
          (balanceResult.data.balances || []).map((balance: SeiBalance) => [
            balance.token.type || balance.token.symbol,
            {
              price: balance.price || 0,
              timestamp: Date.now(),
            },
          ]),
        ),
        totalValueUsd: (balanceResult.data.balances || []).reduce(
          (sum: number, balance: SeiBalance) =>
            sum +
            (Number(balance.balance) / Math.pow(10, balance.token.decimals)) *
              (balance.price || 0),
          0,
        ),
      },
    };

    return createSuccessResponse(transformedData);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("Error fetching Sei balances:", err);
    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}
