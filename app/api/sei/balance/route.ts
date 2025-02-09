import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import axios from "axios";
import { createCache } from "@/lib/utils/core/performance";

interface TokenInfo {
  symbol: string;
  name: string;
  cmcSymbol?: string;
}

// Create a price cache with 2-minute TTL
const priceCache = createCache({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxItems: 1000,
  namespace: "cmc-prices-sei",
});

// Known token mappings for CMC compatibility
const CMC_SYMBOL_MAPPING: Record<string, string> = {
  SEI: "SEI",
  USDC: "USDC",
  ATOM: "ATOM",
  OSMO: "OSMO",
};

// Helper to parse token info from denom
function parseTokenInfo(denom: string): TokenInfo {
  // Handle native SEI token
  if (denom === "usei") {
    return {
      symbol: "SEI",
      name: "Sei",
      cmcSymbol: "SEI",
    };
  }

  // For IBC tokens, use the last part of the denom or a default
  const symbol = denom.split("/").pop()?.toUpperCase() || "UNKNOWN";
  return {
    symbol,
    name: symbol,
    cmcSymbol: CMC_SYMBOL_MAPPING[symbol] || symbol,
  };
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper for delayed retry
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

interface CosmosBalance {
  denom: string;
  amount: string;
}

interface CosmosResponse {
  balances: CosmosBalance[];
}

interface AxiosCosmosResponse {
  data: {
    balances: CosmosBalance[];
  };
}

// Helper to fetch prices from CMC with retry logic
async function fetchCMCPrices(
  symbols: string[],
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const uniqueSymbols = [...new Set(symbols)];

  // Check cache first
  const cachedPrices = uniqueSymbols.reduce(
    (acc, symbol) => {
      const cached = priceCache.get(symbol);
      if (typeof cached === "number") {
        acc[symbol] = cached;
        logger.info(`Using cached price for ${symbol}:`, { price: cached });
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  // Filter out symbols we already have cached
  const symbolsToFetch = uniqueSymbols.filter((s) => !(s in cachedPrices));

  if (symbolsToFetch.length === 0) {
    return cachedPrices;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const cmcResponse = await axios.get(
        "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
        {
          headers: {
            "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
            Accept: "application/json",
          },
          params: {
            symbol: symbolsToFetch.join(","),
            convert: "USD",
            skip_invalid: true,
          },
        },
      );

      if (cmcResponse.data?.data) {
        Object.entries(cmcResponse.data.data).forEach(
          ([symbol, data]: [string, any]) => {
            if (data?.[0]?.quote?.USD?.price) {
              const price = data[0].quote.USD.price;
              prices[symbol] = price;
              priceCache.set(symbol, price);
              logger.info(`Got price for ${symbol}:`, { price });
            }
          },
        );
        break; // Success, exit retry loop
      }
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      logger.warn(`CMC API attempt ${attempt} failed:`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (!isLastAttempt) {
        await sleep(RETRY_DELAY * attempt);
        continue;
      }

      logger.error("All CMC API attempts failed");
    }
  }

  return { ...cachedPrices, ...prices };
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

// Route configuration
export const dynamic = "force-dynamic";
export const revalidate = 0;

// CORS preflight handler
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}

// Error response helper
const createErrorResponse = (
  message: string,
  status: number = 400,
): NextResponse => {
  return NextResponse.json(
    { error: message },
    { status, headers: SECURITY_HEADERS },
  );
};

// Success response helper
const createSuccessResponse = (data: unknown): NextResponse => {
  return NextResponse.json(data, { headers: SECURITY_HEADERS });
};

// GET handler for Sei balance requests
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return createErrorResponse("Missing required parameter: address");
    }

    const quicknodeEndpoint = process.env.QUICKNODE_SEI_ENDPOINT;
    if (!quicknodeEndpoint) {
      return createErrorResponse("QuickNode endpoint not configured");
    }

    // Fetch balances with retry logic
    let balanceResponse: AxiosCosmosResponse | undefined;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get<CosmosResponse>(
          `${quicknodeEndpoint}/cosmos/bank/v1beta1/balances/${address}`,
          {
            timeout: 10000,
          },
        );
        balanceResponse = response;
        break;
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRIES;
        logger.warn(`Sei balance API attempt ${attempt} failed:`, {
          error: error instanceof Error ? error.message : String(error),
        });

        if (!isLastAttempt) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        throw error;
      }
    }

    if (!balanceResponse?.data?.balances) {
      return createErrorResponse("Failed to fetch balances");
    }

    // Process balances and get unique tokens
    const tokenInfos = balanceResponse.data.balances.map(
      (balance: CosmosBalance) => parseTokenInfo(balance.denom),
    );

    // Fetch prices using CMC symbols
    const prices = await fetchCMCPrices(
      tokenInfos.map((info: TokenInfo) => info.cmcSymbol || info.symbol),
    );

    // Transform balances with price data
    const balances = balanceResponse.data.balances
      .map((balance: CosmosBalance, index: number) => {
        const tokenInfo = tokenInfos[index];
        if (!tokenInfo) {
          logger.warn(`Missing token info for balance at index ${index}`);
          return null;
        }

        const uiAmount = parseFloat(balance.amount) / Math.pow(10, 6); // Sei uses 6 decimals
        const price = prices[tokenInfo.cmcSymbol || tokenInfo.symbol] || 0;

        return {
          token: {
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            decimals: 6,
            address: balance.denom,
            chain: "sei",
            type: balance.denom === "usei" ? "sei" : "token",
          },
          balance: balance.amount,
          uiAmount,
          valueUsd: price * uiAmount,
        };
      })
      .filter(
        (balance): balance is NonNullable<typeof balance> =>
          balance !== null && balance.uiAmount > 0,
      )
      .sort((a, b) => {
        if (a.token.type === "sei") return -1;
        if (b.token.type === "sei") return 1;
        return b.valueUsd - a.valueUsd;
      });

    const transformedData = {
      tokens: {
        balances,
        prices: Object.entries(prices).reduce(
          (acc, [symbol, price]) => ({
            ...acc,
            [symbol]: {
              price,
              timestamp: Date.now(),
            },
          }),
          {},
        ),
        totalValueUsd: balances.reduce((sum, b) => sum + b.valueUsd, 0),
      },
    };

    return createSuccessResponse(transformedData);
  } catch (error) {
    logger.error(
      "Sei balance API error:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}
