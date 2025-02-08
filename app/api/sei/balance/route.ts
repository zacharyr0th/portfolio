import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { isValidAddress } from "@/lib/chains/constants";
import axios from "axios";

// Add token mapping at the top of the file
interface TokenInfo {
  symbol: string;
  name: string;
}

const TOKEN_MAPPING: Record<string, TokenInfo> = {
  usei: { symbol: "SEI", name: "Sei" },
  "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5": {
    symbol: "USDC",
    name: "USD Coin",
  },
  "ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9": {
    symbol: "ATOM",
    name: "Cosmos Hub ATOM",
  },
  "ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518": {
    symbol: "OSMO",
    name: "Osmosis",
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

    // Get unique tokens from balances
    const uniqueTokens = response.data.balances
      .map((balance: any) => {
        const mapping = TOKEN_MAPPING[balance.denom];
        return mapping?.symbol || null;
      })
      .filter(Boolean);

    // Fetch prices from CMC for all supported tokens
    const prices: Record<string, number> = {};
    if (uniqueTokens.length > 0) {
      try {
        const cmcResponse = await axios.get(
          "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
          {
            headers: {
              "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
            },
            params: {
              symbol: uniqueTokens.join(","),
              convert: "USD",
            },
          },
        );

        // Extract prices for each token
        Object.entries(cmcResponse.data?.data || {}).forEach(
          ([symbol, data]: [string, any]) => {
            if (data?.[0]?.quote?.USD?.price) {
              prices[symbol] = data[0].quote.USD.price;
            }
          },
        );
      } catch (error) {
        logger.error(
          "Failed to fetch token prices from CMC:",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // Transform the response to match the expected format
    const balances = response.data.balances.map((balance: any) => {
      const mapping = TOKEN_MAPPING[balance.denom];
      const uiAmount = parseFloat(balance.amount) / Math.pow(10, 6);
      const symbol = mapping?.symbol || balance.denom;

      return {
        token: {
          symbol,
          name: mapping?.name || balance.denom,
          decimals: 6,
          address: balance.denom,
          chain: "sei",
          type: balance.denom === "usei" ? "sei" : "token",
        },
        balance: balance.amount,
        uiAmount,
        valueUsd: prices[symbol] ? uiAmount * prices[symbol] : 0,
      };
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
    logger.error("Sei balance API error:", err);
    return createErrorResponse(err.message, error instanceof Error ? 400 : 500);
  }
}
