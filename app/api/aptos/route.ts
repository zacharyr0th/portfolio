import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { ADDRESS_REGEX } from "@/lib/chains/constants";

const APTOS_RPC_URL =
  process.env.APTOS_RPC_URL || "https://fullnode.mainnet.aptoslabs.com/v1";
const PANORA_BASE_URL = "https://api.panora.exchange";

// API configuration
const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
  REQUEST_TIMEOUT: 10000, // 10 seconds
  RATE_LIMIT: {
    MAX_REQUESTS: 30,
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

// Known token addresses
const KNOWN_TOKENS = {
  APT: "0x1::aptos_coin::AptosCoin",
  USDC: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC",
};

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

interface TokenBalance {
  token: {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
    chain: string;
    type: string;
  };
  balance: string;
  uiAmount: number;
  valueUsd: number;
}

interface TokenData {
  balances: TokenBalance[];
  prices: Record<string, { price: number; timestamp: number }>;
  totalValueUsd: number;
}

type AptosResource = {
  type: string;
  data: {
    coin?: {
      value: string;
    };
  };
};

// Cache store with TTL
const responseCache = new Map<string, { data: TokenData; timestamp: number }>();
const RESPONSE_CACHE_TTL = 30 * 1000; // 30 seconds

// Helper functions
function getCachedResponse(key: string): TokenData | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < RESPONSE_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResponse(key: string, data: TokenData): void {
  responseCache.set(key, { data, timestamp: Date.now() });
}

async function fetchAccountResources(
  address: string,
): Promise<AptosResource[]> {
  if (!canMakeRequest()) {
    throw new Error("Rate limit exceeded");
  }
  trackRequest();

  return withRetry(async () => {
    const response = await fetch(
      `${APTOS_RPC_URL}/accounts/${address}/resources`,
    );
    if (!response.ok) {
      throw new Error(`Aptos API error: ${response.status}`);
    }
    return response.json();
  });
}

async function fetchPrices(
  tokenAddresses: string[],
): Promise<Record<string, number>> {
  if (!canMakeRequest()) {
    throw new Error("Rate limit exceeded");
  }
  trackRequest();

  return withRetry(async () => {
    try {
      const queryString = `tokenAddress=${tokenAddresses.join(",")}`;
      const response = await fetch(`${PANORA_BASE_URL}/prices?${queryString}`, {
        method: "GET",
        headers: {
          "x-api-key":
            "a4^KV_EaTf4MW#ZdvgGKX#HUD^3IFEAOV_kzpIE^3BQGA8pDnrkT7JcIy#HNlLGi",
        },
      });

      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }

      const data = await response.json();
      logger.info("Panora price response:", data);

      const prices: Record<string, number> = {};

      // Process all returned prices
      if (Array.isArray(data)) {
        for (const priceData of data) {
          if (priceData?.tokenAddress && priceData?.usdPrice) {
            prices[priceData.tokenAddress] = Number(priceData.usdPrice);
          }
        }
      }

      return prices;
    } catch (error) {
      logger.error(
        "Price fetch error:",
        error instanceof Error ? error : new Error("Unknown error"),
      );
      return {} as Record<string, number>;
    }
  });
}

async function fetchTokenBalances(address: string): Promise<TokenData> {
  const resources = await fetchAccountResources(address);
  const balances: TokenBalance[] = [];
  const tokenAddresses: string[] = [];

  // Process resources to find coin balances
  for (const resource of resources) {
    if (resource.type.startsWith("0x1::coin::CoinStore<")) {
      const coinType = resource.type.match(/<(.+)>/)?.[1];
      if (!coinType || !resource.data?.coin?.value) continue;

      const balance = resource.data.coin.value;
      // Skip zero balances
      if (balance === "0") continue;

      // Get token info
      let symbol = coinType.split("::").pop() || "UNKNOWN";
      let name = symbol;
      let decimals = 8; // Default decimals

      // Handle known tokens
      if (coinType === KNOWN_TOKENS.APT) {
        symbol = "APT";
        name = "Aptos Coin";
      } else if (coinType === KNOWN_TOKENS.USDC) {
        symbol = "USDC";
        name = "USD Coin";
        decimals = 6;
      }

      const uiAmount = Number(balance) / Math.pow(10, decimals);

      balances.push({
        token: {
          symbol,
          name,
          decimals,
          address: coinType,
          chain: "aptos",
          type: coinType,
        },
        balance,
        uiAmount,
        valueUsd: 0,
      });

      tokenAddresses.push(coinType);
    }
  }

  // Get prices from Panora
  const prices = await fetchPrices(tokenAddresses);
  const pricesMap: Record<string, { price: number; timestamp: number }> = {};

  // Update balances with prices
  for (const balance of balances) {
    const price = prices[balance.token.type] || 0;
    balance.valueUsd = balance.uiAmount * price;

    if (price > 0) {
      const priceEntry = {
        price,
        timestamp: Date.now(),
      };
      pricesMap[balance.token.symbol] = priceEntry;
      pricesMap[balance.token.type] = priceEntry;
    }
  }

  // Calculate total value
  const totalValueUsd = balances.reduce((sum, b) => sum + (b.valueUsd || 0), 0);

  return {
    balances: balances.sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0)),
    prices: pricesMap,
    totalValueUsd,
  };
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

// GET handler for Aptos balance requests
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return createErrorResponse("Missing required parameter: address");
    }

    // Validate address format
    if (!ADDRESS_REGEX.aptos.test(address)) {
      return createErrorResponse("Invalid Aptos address format");
    }

    // Check rate limit
    if (!canMakeRequest()) {
      return createErrorResponse("Rate limit exceeded", 429);
    }

    // Try to get cached response first
    const cachedData = getCachedResponse(address);
    if (cachedData) {
      return createSuccessResponse({ tokens: cachedData });
    }

    // Fetch new data
    const tokenData = await fetchTokenBalances(address);

    // Cache the response
    setCachedResponse(address, tokenData);

    return createSuccessResponse({ tokens: tokenData });
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("Aptos balance API error:", err);

    // Handle specific error types
    if (err.message.includes("Rate limit exceeded")) {
      return createErrorResponse("Too many requests", 429);
    }
    if (err.message.includes("Request timeout")) {
      return createErrorResponse("Request timeout", 408);
    }
    if (err.message.includes("Aptos API error")) {
      return createErrorResponse(err.message, 502);
    }

    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}

// POST handler for internal RPC requests
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return createErrorResponse("Missing required parameter: endpoint");
    }

    const response = await fetch(`${APTOS_RPC_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Aptos RPC error: ${response.status}`);
    }

    const data = await response.json();
    return createSuccessResponse(data);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("Aptos RPC API error:", err);
    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}

// CORS preflight handler
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
