import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import axios from "axios";
import { createCache } from "@/lib/utils/core/performance";

// Token mapping for known Sui tokens
interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  cmcSymbol?: string; // Added for CMC mapping
}

// Create a price cache with 30-minute TTL
const priceCache = createCache({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxItems: 1000,
  namespace: "cmc-prices-30min",
});

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

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds between retries

// Helper for delayed retry
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Known token mappings for CMC compatibility
const CMC_SYMBOL_MAPPING: Record<string, string> = {
  SUI: "SUI",
  USDC: "USDC",
  USDT: "USDT",
  WETH: "ETH",
  WBTC: "BTC",
};

// Helper to parse token info from coin type
function parseTokenInfo(coinType: string): TokenInfo {
  const parts = coinType.split("::");
  const lastPart = parts[parts.length - 1] || "UNKNOWN";
  const symbol = lastPart.toUpperCase();

  return {
    symbol,
    name: lastPart,
    decimals: coinType === "0x2::sui::SUI" ? 9 : 6,
    cmcSymbol: CMC_SYMBOL_MAPPING[symbol] || symbol,
  };
}

// Helper to store cache with TTL
function setCacheWithTTL(key: string, value: number) {
  priceCache.set(key, value);
  // Cache for 30 minutes
  setTimeout(() => priceCache.set(key, undefined), 30 * 60 * 1000);
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
  const symbolsToFetch = uniqueSymbols.filter((s) => !cachedPrices[s]);

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
              setCacheWithTTL(symbol, price);
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

interface TokenBalance {
  coinType: string;
  totalBalance: string;
}

interface SuiRpcResponse {
  jsonrpc: string;
  result: TokenBalance[];
  id: number;
}

interface AxiosTokenResponse {
  data: SuiRpcResponse;
}

interface ExtendedError extends Error {
  response?: unknown;
  details?: unknown;
}

// GET handler for Sui balance requests
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return createErrorResponse("Missing required parameter: address");
    }

    const suiRpcUrl = process.env.SUI_RPC_URL;
    if (!suiRpcUrl) {
      return createErrorResponse("Sui RPC endpoint not configured");
    }

    logger.info("Starting Sui balance fetch", {
      address,
      rpcUrl: suiRpcUrl,
    });

    // Fetch balances with retry logic
    let balanceResponse: AxiosTokenResponse | undefined;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`Attempt ${attempt} to fetch Sui balances`);

        const response = await axios.post<SuiRpcResponse>(
          suiRpcUrl,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "suix_getAllBalances",
            params: [address],
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 10000,
          },
        );

        logger.debug("Sui RPC raw response:", {
          status: response.status,
          data: response.data,
        });

        // Validate response structure
        if (!response.data?.result) {
          throw new Error("Invalid response structure from Sui RPC");
        }

        balanceResponse = response;
        break;
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRIES;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorResponse = axios.isAxiosError(error)
          ? error.response?.data
          : undefined;

        logger.warn(`Sui RPC attempt ${attempt} failed:`, {
          error: errorMessage,
          response: errorResponse,
          status: axios.isAxiosError(error)
            ? error.response?.status
            : undefined,
        });

        if (!isLastAttempt) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        throw error;
      }
    }

    if (!balanceResponse?.data?.result) {
      logger.error("Invalid response structure from Sui RPC");
      logger.debug("Response data:", {
        data: JSON.stringify(balanceResponse?.data),
      });
      return createErrorResponse(
        "Failed to fetch balances: Invalid response structure",
      );
    }

    // Process balances and get unique tokens
    const tokenInfos = balanceResponse.data.result.map(
      (balance: TokenBalance) => {
        const info = parseTokenInfo(balance.coinType);
        logger.debug("Parsed token info:", {
          coinType: balance.coinType,
          info,
        });
        return info;
      },
    );

    // Fetch prices using CMC symbols
    const prices = await fetchCMCPrices(
      tokenInfos.map((info: TokenInfo) => info.cmcSymbol || info.symbol),
    );

    logger.debug("Fetched prices:", { prices });

    // Transform balances with price data
    const balances = balanceResponse.data.result
      .map((balance: TokenBalance, index: number) => {
        const tokenInfo = tokenInfos[index];
        if (!tokenInfo) {
          logger.warn(`Missing token info for balance at index ${index}`);
          return null;
        }

        const uiAmount =
          parseFloat(balance.totalBalance) / Math.pow(10, tokenInfo.decimals);
        const price = prices[tokenInfo.cmcSymbol || tokenInfo.symbol] || 0;

        logger.debug(`Processing balance for ${tokenInfo.symbol}:`, {
          coinType: balance.coinType,
          totalBalance: balance.totalBalance,
          uiAmount,
          price,
          valueUsd: uiAmount * price,
        });

        return {
          token: {
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            decimals: tokenInfo.decimals,
            tokenAddress: balance.coinType,
            chainId: 1,
            isNative: balance.coinType === "0x2::sui::SUI",
          },
          balance: balance.totalBalance,
          uiAmount,
          valueUsd: price * uiAmount,
        };
      })
      .filter(
        (balance): balance is NonNullable<typeof balance> =>
          balance !== null && balance.uiAmount > 0,
      )
      .sort((a, b) => {
        if (a.token.isNative) return -1;
        if (b.token.isNative) return 1;
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

    logger.info("Successfully processed Sui balances", {
      address,
      tokenCount: balances.length,
      totalValue: transformedData.tokens.totalValueUsd,
    });

    return createSuccessResponse(transformedData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      const { url, method } = error.config || {};
      logger.error(`Sui balance API error (network): ${errorMessage}`);
      logger.debug("Network error details", { status, url, method });
      if (data) logger.debug("Response data:", data);
    } else {
      logger.error(`Sui balance API error: ${errorMessage}`);
    }

    return createErrorResponse(
      `Failed to fetch balances: ${errorMessage}`,
      error instanceof Error ? 400 : 500,
    );
  }
}
