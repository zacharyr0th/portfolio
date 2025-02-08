import { chainInfo } from "../config";
import type {
  TokenBalance,
  TokenPrice,
  SuiBalance,
  SuiCoinMetadata,
} from "./types";
import type { ChainHandler } from "../types";
import { BaseChainHandler } from "../baseHandler";
import { logger } from "@/lib/utils/core/logger";
import { SuiTokenBalance } from "./TokenBalance";

// Constants for Sui chain
const HANDLER_CONSTANTS = {
  REQUEST_TIMEOUT: 30000,
  DEFAULT_COIN_TYPE: "0x2::sui::SUI",
};

// Known token mappings for Sui
const TOKEN_SYMBOL_MAP: Readonly<
  Record<string, { symbol: string; name: string; decimals: number }>
> = Object.freeze({
  "0x2::sui::SUI": { symbol: "SUI", name: "Sui", decimals: 9 },
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC":
    {
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
});

const DEFAULT_PRICE: TokenPrice = {
  price: 0,
  priceChange24h: 0,
};

// Helper function to fetch token price from standard RPC
async function fetchTokenPrice(coinType: string): Promise<TokenPrice> {
  try {
    const response = await fetch(
      `/api/sui/price?coinType=${encodeURIComponent(coinType)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.status}`);
    }
    const data = await response.json();
    return {
      price: data.price || 0,
      priceChange24h: data.priceChange24h || 0,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error fetching price for ${coinType}: ${errorMessage}`);
    return DEFAULT_PRICE;
  }
}

// Update the RPC request function
async function makeRpcRequest<T>(method: string, params: any[]): Promise<T> {
  const response = await fetch("/api/sui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });

  if (!response.ok) {
    throw new Error(`Sui API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(
      `Sui RPC error: ${data.error.message || JSON.stringify(data.error)}`,
    );
  }

  return data.result as T;
}

// Helper function to fetch coin metadata
async function fetchCoinMetadata(
  coinType: string,
): Promise<SuiCoinMetadata | null> {
  try {
    const data = await makeRpcRequest<SuiCoinMetadata>("suix_getCoinMetadata", [
      coinType,
    ]);
    return data;
  } catch (error) {
    logger.error(
      `Error fetching coin metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

// Helper function to fetch balances
async function fetchBalances(publicKey: string): Promise<SuiBalance[]> {
  const data = await makeRpcRequest<SuiBalance[]>("suix_getAllBalances", [
    publicKey,
  ]);
  return data;
}

// Create Sui handler instance
const suiHandlerInstance = new BaseChainHandler({
  chainName: "sui",
  fetchBalancesImpl: async (publicKey: string, accountId: string) => {
    if (!publicKey?.trim()) {
      logger.warn("No public key provided for Sui balance fetch");
      return { balances: [] };
    }

    try {
      logger.debug(`Fetching balances for Sui address: ${publicKey}`);
      const balances = await fetchBalances(publicKey);

      // Process and validate each balance
      const processedBalances = await Promise.all(
        balances.map(async (balance) => {
          try {
            // Get token info from mapping or fetch metadata
            let tokenInfo = TOKEN_SYMBOL_MAP[balance.coinType];
            const isNativeSui =
              balance.coinType === HANDLER_CONSTANTS.DEFAULT_COIN_TYPE;

            if (!tokenInfo) {
              logger.debug(
                `Fetching metadata for unknown token: ${balance.coinType}`,
              );
              const metadata = await fetchCoinMetadata(balance.coinType);
              if (metadata) {
                tokenInfo = {
                  symbol: metadata.symbol,
                  name: metadata.name,
                  decimals: metadata.decimals,
                };
              } else {
                logger.debug(
                  `No metadata found for token: ${balance.coinType}, using defaults`,
                );
                tokenInfo = {
                  symbol: balance.coinType.split("::").pop() || "UNKNOWN",
                  name: "Unknown Token",
                  decimals: 9,
                };
              }
            }

            // Calculate token value
            const uiAmount =
              Number(balance.totalBalance) / Math.pow(10, tokenInfo.decimals);

            // Skip dust amounts
            const minValue = isNativeSui ? 0.000001 : 0.01;
            if (uiAmount < minValue) {
              return null;
            }

            // Fetch price data from QuickNode
            const priceData = await fetchTokenPrice(balance.coinType);

            return {
              token: {
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                decimals: tokenInfo.decimals,
                tokenAddress: balance.coinType,
                chainId: 1, // Sui mainnet
                isNative: isNativeSui,
              },
              balance: balance.totalBalance,
              uiAmount,
              price: priceData,
            } as TokenBalance;
          } catch (err) {
            logger.error(
              `Error processing balance for ${balance.coinType}: ${
                err instanceof Error ? err.message : "Unknown error"
              }`,
            );
            return null;
          }
        }),
      );

      // Filter out null values and sort by balance value, putting native SUI first
      const tokenBalances = processedBalances
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .sort((a, b) => {
          // Always put native SUI first
          if (a.token.tokenAddress === HANDLER_CONSTANTS.DEFAULT_COIN_TYPE)
            return -1;
          if (b.token.tokenAddress === HANDLER_CONSTANTS.DEFAULT_COIN_TYPE)
            return 1;

          // Then sort by value
          const aValue = a.uiAmount * (a.price?.price || 0);
          const bValue = b.uiAmount * (b.price?.price || 0);
          return bValue - aValue;
        });

      logger.debug(`Processed ${tokenBalances.length} valid Sui balances`);
      return { balances: tokenBalances };
    } catch (error) {
      logger.error(
        `Error fetching Sui balances: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  },
  fetchPricesImpl: async () => {
    try {
      // Get all unique token symbols
      const tokenSymbols = Object.values(TOKEN_SYMBOL_MAP).map((t) => t.symbol);
      const uniqueSymbols = Array.from(new Set(tokenSymbols));

      // Fetch prices for each token
      const prices: Record<string, TokenPrice> = {};
      await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          const coinType = Object.entries(TOKEN_SYMBOL_MAP).find(
            ([_, info]) => info.symbol === symbol,
          )?.[0];
          if (coinType) {
            const price = await fetchTokenPrice(coinType);
            prices[symbol] = price;
          }
        }),
      );

      return prices;
    } catch (error) {
      logger.error(
        `Error fetching Sui prices: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      // Return default prices for all tokens on error
      return Object.fromEntries(
        Object.values(TOKEN_SYMBOL_MAP).map((t) => [t.symbol, DEFAULT_PRICE]),
      );
    }
  },
  getExplorerUrlImpl: (publicKey: string) => {
    const chain = chainInfo["sui"];
    return `${chain.explorer}/address/${publicKey}`;
  },
  BalanceDisplayComponent: SuiTokenBalance,
});

// Export the handler interface
export const suiHandler: ChainHandler = suiHandlerInstance;

// Export cleanup function for tests and hot reloading
export const clearCache = () => suiHandlerInstance.clearCache();
