import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { ADDRESS_REGEX } from "@/lib/chains/constants";

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const JUPITER_API_BASE_URL = "https://price.jup.ag/v2";

// API configuration
const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
  REQUEST_TIMEOUT: 10000, // 10 seconds
  RATE_LIMIT: {
    MAX_REQUESTS: 600, // Jupiter allows 600 req/min
    WINDOW: 60 * 1000, // 1 minute
  },
} as const;

// Rate limiting
const requestTimestamps: number[] = [];

function canMakeRequest(): boolean {
  const now = Date.now();
  // Remove timestamps older than the window
  while (
    requestTimestamps.length > 0 &&
    requestTimestamps[0] &&
    requestTimestamps[0] < now - API_CONFIG.RATE_LIMIT.WINDOW
  ) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length < API_CONFIG.RATE_LIMIT.MAX_REQUESTS;
}

function trackRequest(): void {
  requestTimestamps.push(Date.now());
}

// Retry mechanism
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let retries = API_CONFIG.MAX_RETRIES;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timeout")),
          API_CONFIG.REQUEST_TIMEOUT,
        );
      }),
    ]);
  } catch (error) {
    if (retries > 0) {
      logger.warn(
        `Operation failed, retrying... (${API_CONFIG.MAX_RETRIES - retries + 1}/${API_CONFIG.MAX_RETRIES})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, API_CONFIG.RETRY_DELAY),
      );
      retries--;
      return withRetry(operation);
    }
    throw error;
  }
}

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

// Types
interface JupiterPriceResponse {
  data: {
    [key: string]: {
      id: string;
      type: string;
      price: string;
      extraInfo?: {
        lastSwappedPrice?: {
          lastJupiterSellPrice?: string;
          lastJupiterBuyPrice?: string;
        };
        quotedPrice?: {
          buyPrice?: string;
          sellPrice?: string;
        };
        confidenceLevel?: string;
      };
    };
  };
  timeTaken: number;
}

interface TokenPrice {
  price: number;
  priceChange24h: number;
  lastUpdated: number;
  confidence: number;
}

// Cache store with TTL
const priceCache = new Map<
  string,
  { data: Record<string, TokenPrice>; timestamp: number }
>();
const PRICE_CACHE_TTL = 30 * 1000; // 30 seconds

// Helper functions
function getCachedPrices(key: string): Record<string, TokenPrice> | null {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPrices(key: string, data: Record<string, TokenPrice>): void {
  priceCache.set(key, { data, timestamp: Date.now() });
}

async function fetchJupiterPrices(
  tokenAddresses: string[],
  includeExtraInfo: boolean = false,
): Promise<Record<string, TokenPrice>> {
  if (!canMakeRequest()) {
    throw new Error("Rate limit exceeded");
  }
  trackRequest();

  return withRetry(async () => {
    try {
      // Build query string with token addresses
      const queryParams = new URLSearchParams();
      tokenAddresses.forEach((address) => queryParams.append("ids", address));
      if (includeExtraInfo) {
        queryParams.append("showExtraInfo", "true");
      }

      const response = await fetch(
        `${JUPITER_API_BASE_URL}/price?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data: JupiterPriceResponse = await response.json();
      const prices: Record<string, TokenPrice> = {};

      // Process each token's price data
      for (const [address, priceData] of Object.entries(data.data)) {
        const price = Number(priceData.price);
        if (!isNaN(price) && price > 0) {
          let confidence = 1;

          // Calculate confidence based on available data
          if (priceData.extraInfo?.confidenceLevel) {
            confidence =
              priceData.extraInfo.confidenceLevel === "high"
                ? 1
                : priceData.extraInfo.confidenceLevel === "medium"
                  ? 0.7
                  : 0.4;
          }

          prices[address] = {
            price,
            priceChange24h: 0, // Jupiter v2 doesn't provide 24h change
            lastUpdated: Date.now(),
            confidence,
          };
        }
      }

      return prices;
    } catch (error) {
      logger.error(
        "Jupiter price fetch error:",
        error instanceof Error ? error : new Error("Unknown error"),
      );
      return {};
    }
  });
}

// Route configuration
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper functions
const createErrorResponse = (
  message: string,
  status: number = 400,
): NextResponse => {
  return NextResponse.json(
    { error: message },
    { status, headers: SECURITY_HEADERS },
  );
};

const createSuccessResponse = (data: unknown): NextResponse => {
  return NextResponse.json(data, { headers: SECURITY_HEADERS });
};

// GET handler for token prices
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const tokens = searchParams.get("tokens");
    const showExtraInfo = searchParams.get("showExtraInfo") === "true";

    if (!tokens) {
      return createErrorResponse("Missing required parameter: tokens");
    }

    const tokenAddresses = tokens.split(",");

    // Check rate limit
    if (!canMakeRequest()) {
      return createErrorResponse("Rate limit exceeded", 429);
    }

    // Try to get cached prices first
    const cacheKey = tokens + (showExtraInfo ? "_extra" : "");
    const cachedPrices = getCachedPrices(cacheKey);
    if (cachedPrices) {
      return createSuccessResponse({ prices: cachedPrices });
    }

    // Fetch new prices
    const prices = await fetchJupiterPrices(tokenAddresses, showExtraInfo);

    // Cache the response
    setCachedPrices(cacheKey, prices);

    return createSuccessResponse({ prices });
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("Solana price API error:", err);

    // Handle specific error types
    if (err.message.includes("Rate limit exceeded")) {
      return createErrorResponse("Too many requests", 429);
    }
    if (err.message.includes("Request timeout")) {
      return createErrorResponse("Request timeout", 408);
    }
    if (err.message.includes("Jupiter API error")) {
      return createErrorResponse(err.message, 502);
    }

    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}

// POST handler for internal RPC requests
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { method, params } = await req.json();

    if (!method) {
      return createErrorResponse("Missing required parameter: method");
    }

    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method,
        params: params || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Solana RPC error: ${response.status}`);
    }

    const data = await response.json();
    return createSuccessResponse(data);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("Solana RPC API error:", err);
    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}

// CORS preflight handler
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
