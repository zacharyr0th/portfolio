import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import axios from "axios";

// Token mapping for known Sui tokens
interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
}

const TOKEN_MAPPING: Record<string, TokenInfo> = {
  "0x2::sui::SUI": { symbol: "SUI", name: "Sui", decimals: 9 },
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC":
    {
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
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

// GET handler for Sui balance requests
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return createErrorResponse("Missing required parameter: address");
    }

    // Get the Sui RPC endpoint from environment variables
    const suiRpcUrl = process.env.SUI_RPC_URL;
    if (!suiRpcUrl) {
      return createErrorResponse("Sui RPC endpoint not configured");
    }

    // Log the request
    logger.info("Fetching Sui balances", { address, rpcUrl: suiRpcUrl });

    // Fetch balances using Sui RPC API
    const response = await axios.post(
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
        },
      },
    );

    // Log the raw response for debugging
    logger.debug("Sui RPC response", {
      status: response.status,
      data: response.data,
    });

    if (!response.data?.result) {
      return createErrorResponse("Failed to fetch balances");
    }

    // Get unique tokens from balances
    const uniqueTokens = response.data.result
      .map((balance: any) => {
        const mapping = TOKEN_MAPPING[balance.coinType];
        return mapping?.symbol || null;
      })
      .filter(Boolean);

    // Log unique tokens we're fetching prices for
    logger.info("Fetching prices for tokens:", { uniqueTokens });

    // Fetch prices from CMC for all supported tokens
    const prices: Record<string, number> = {};
    if (uniqueTokens.length > 0) {
      try {
        logger.info("Making CMC API request", {
          symbols: uniqueTokens.join(","),
          apiKey: process.env.CMC_API_KEY ? "configured" : "missing",
        });

        const cmcResponse = await axios.get(
          "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
          {
            headers: {
              "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
              Accept: "application/json",
            },
            params: {
              symbol: uniqueTokens.join(","),
              convert: "USD",
              skip_invalid: true,
            },
          },
        );

        logger.debug("CMC API response:", {
          status: cmcResponse.status,
          statusText: cmcResponse.statusText,
          data: cmcResponse.data,
        });

        // Extract prices for each token
        if (cmcResponse.data?.data) {
          Object.entries(cmcResponse.data.data).forEach(
            ([symbol, data]: [string, any]) => {
              const price = data?.quote?.USD?.price;
              if (typeof price === "number" && !isNaN(price)) {
                prices[symbol] = price;
                logger.info(`Got price for ${symbol}:`, { price });
              } else {
                logger.warn(`Invalid price data for ${symbol}`, { data });
              }
            },
          );
        }

        // Log final prices object
        logger.info("Final prices:", { prices });
      } catch (error) {
        if (error instanceof Error) {
          logger.error("Failed to fetch token prices from CMC:", {
            message: error.message,
            stack: error.stack,
            response: axios.isAxiosError(error)
              ? error.response?.data
              : undefined,
          });
        } else {
          logger.error("Failed to fetch token prices from CMC:", {
            error: String(error),
          });
        }
      }
    } else {
      logger.warn("No supported tokens found to fetch prices for");
    }

    // Transform the response to match the expected format
    const balances = response.data.result
      .map((balance: any) => {
        const mapping = TOKEN_MAPPING[balance.coinType];
        const decimals = mapping?.decimals || 9;
        const uiAmount =
          parseFloat(balance.totalBalance) / Math.pow(10, decimals);
        const symbol =
          mapping?.symbol || balance.coinType.split("::").pop() || "Unknown";

        const tokenPrice = prices[symbol] || 0;
        logger.debug(`Processing balance for ${symbol}:`, {
          uiAmount,
          price: tokenPrice,
          valueUsd: uiAmount * tokenPrice,
        });

        return {
          token: {
            symbol,
            name: mapping?.name || balance.coinType,
            decimals,
            tokenAddress: balance.coinType,
            chainId: 1, // Sui mainnet
            isNative: balance.coinType === "0x2::sui::SUI",
          },
          balance: balance.totalBalance,
          uiAmount,
          valueUsd: tokenPrice ? uiAmount * tokenPrice : 0,
        };
      })
      // Filter out zero balances
      .filter((balance) => balance.uiAmount > 0)
      // Sort by value, with native SUI first
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
        totalValueUsd: balances.reduce(
          (sum: number, b: { valueUsd: number }) => sum + b.valueUsd,
          0,
        ),
      },
    };

    return createSuccessResponse(transformedData);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Internal server error");
    logger.error("Sui balance API error:", err);
    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}
