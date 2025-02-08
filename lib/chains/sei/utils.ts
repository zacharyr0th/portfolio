import {
  CHAIN_DECIMALS,
  KNOWN_TOKENS,
  SEI_RPC_URL,
  QUICKNODE_BASE_URL,
  QUICKNODE_API_KEY,
} from "./constants";
import type {
  SeiToken,
  TokenBalance,
  TokenPrice,
  SeiBalanceResponse,
} from "./types";
import { logger } from "@/lib/utils/core/logger";

// Format large numbers to K/M/B format with 2 decimal places
export function formatLargeNumber(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(2) + "B";
  } else if (absNum >= 1e6) {
    return (num / 1e6).toFixed(2) + "M";
  } else if (absNum >= 1e3) {
    return (num / 1e3).toFixed(2) + "K";
  } else if (absNum < 0.01) {
    return "< 0.01";
  }
  return num.toFixed(2);
}

// Format USD values
export function formatUSD(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  } else if (value < 0.01 && value > 0) {
    return "< $0.01";
  }
  return `$${value.toFixed(2)}`;
}

// Shorten address for display
export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Convert raw balance to UI amount
export function convertToUiAmount(
  balance: string,
  decimals: number = CHAIN_DECIMALS,
): number {
  return Number(balance) / Math.pow(10, decimals);
}

// Fetch token balances from Sei RPC
export async function fetchBalances(address: string): Promise<TokenBalance[]> {
  try {
    logger.info(`Fetching balances for Sei address: ${address}`, {
      rpcUrl: SEI_RPC_URL,
    });

    const response = await fetch(
      `${SEI_RPC_URL}/cosmos/bank/v1beta1/balances/${address}`,
    );
    const responseText = await response.text();

    if (!response.ok) {
      logger.error(`Failed to fetch balances`, new Error(responseText), {
        status: response.status,
        response: responseText,
      });
      throw new Error(`Failed to fetch balances: ${response.statusText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logger.error("Failed to parse response", new Error(responseText));
      throw new Error("Invalid response format from Sei RPC");
    }

    if (!data.balances || !Array.isArray(data.balances)) {
      logger.error(
        "Invalid balance data format",
        new Error(JSON.stringify(data)),
      );
      throw new Error("Invalid balance data format");
    }

    return data.balances.map((balance: any) => {
      const symbol = getTokenSymbol(balance.denom);
      const name = getTokenName(balance.denom);

      logger.info(`Processing token: ${symbol}`, {
        denom: balance.denom,
        amount: balance.amount,
      });

      return {
        token: {
          symbol,
          name,
          decimals: CHAIN_DECIMALS,
          address: balance.denom,
          chain: "sei",
          type: balance.denom,
        },
        balance: balance.amount,
        uiAmount: convertToUiAmount(balance.amount),
        valueUsd: 0, // Will be updated with price data
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error fetching Sei balances", new Error(errorMessage));
    throw new Error(`Failed to fetch Sei balances: ${errorMessage}`);
  }
}

// Fetch token prices from QuickNode
export async function fetchPrices(
  tokens: string[],
): Promise<Record<string, TokenPrice>> {
  try {
    if (!QUICKNODE_BASE_URL || !QUICKNODE_API_KEY) {
      throw new Error("QuickNode configuration missing");
    }

    const response = await fetch(QUICKNODE_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": QUICKNODE_API_KEY,
      },
      body: JSON.stringify({
        tokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.statusText}`);
    }

    const data = await response.json();
    const prices: Record<string, TokenPrice> = {};

    for (const [token, price] of Object.entries(data.prices)) {
      prices[token] = {
        price: Number(price),
        timestamp: Date.now(),
      };
    }

    return prices;
  } catch (error) {
    logger.error("Error fetching token prices:", error);
    throw error;
  }
}

// Get token symbol from denom
function getTokenSymbol(denom: string): string {
  // Check known tokens first
  for (const [symbol, address] of Object.entries(KNOWN_TOKENS)) {
    if (address === denom) {
      return symbol;
    }
  }

  // Handle native SEI token
  if (denom === "usei") {
    return "SEI";
  }

  // Handle IBC tokens
  if (denom.startsWith("ibc/")) {
    return "IBC";
  }

  // Default to uppercase denom
  return denom.toUpperCase();
}

// Get token name from denom
function getTokenName(denom: string): string {
  // Check known tokens first
  for (const [symbol, address] of Object.entries(KNOWN_TOKENS)) {
    if (address === denom) {
      return symbol;
    }
  }

  // Handle native SEI token
  if (denom === "usei") {
    return "Sei";
  }

  // Handle IBC tokens
  if (denom.startsWith("ibc/")) {
    return "IBC Token";
  }

  // Default to denom
  return denom;
}

// Calculate total portfolio value
export function calculateTotalValue(balances: TokenBalance[]): number {
  return balances.reduce(
    (total, balance) => total + (balance.valueUsd || 0),
    0,
  );
}

// Update token balances with price data
export function updateBalancesWithPrices(
  balances: TokenBalance[],
  prices: Record<string, TokenPrice>,
): TokenBalance[] {
  return balances.map((balance) => ({
    ...balance,
    valueUsd: balance.uiAmount * (prices[balance.token.symbol]?.price || 0),
  }));
}

// Format balance response
export function formatBalanceResponse(
  balances: TokenBalance[],
  prices: Record<string, TokenPrice>,
): SeiBalanceResponse {
  const updatedBalances = updateBalancesWithPrices(balances, prices);
  const totalValueUsd = calculateTotalValue(updatedBalances);

  return {
    balances: updatedBalances,
    prices,
    totalValueUsd,
  };
}

// Validate Sei address
export function isValidSeiAddress(address: string): boolean {
  const regex = /^sei1[a-zA-Z0-9]{40}$/;
  return regex.test(address);
}

// Parse error messages
export function parseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
