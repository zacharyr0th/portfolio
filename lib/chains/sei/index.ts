import {
  CHAIN_ID,
  CHAIN_NAME,
  CHAIN_SYMBOL,
  CHAIN_DECIMALS,
  KNOWN_TOKENS,
  SEI_RPC_URL,
  EXPLORER_CONFIG,
  ERROR_MESSAGES,
} from "./constants";

import {
  fetchBalances,
  fetchPrices,
  formatBalanceResponse,
  isValidSeiAddress,
  parseError,
} from "./utils";

import type { SeiBalanceResponse, TokenBalance, TokenPrice } from "./types";
import { logger } from "@/lib/utils/core/logger";

export class SeiChain {
  private static instance: SeiChain;
  private balanceCache: Map<
    string,
    { data: SeiBalanceResponse; timestamp: number }
  >;
  private priceCache: Map<string, { price: number; timestamp: number }>;

  private constructor() {
    this.balanceCache = new Map();
    this.priceCache = new Map();
  }

  public static getInstance(): SeiChain {
    if (!SeiChain.instance) {
      SeiChain.instance = new SeiChain();
    }
    return SeiChain.instance;
  }

  // Get chain information
  public getChainInfo() {
    return {
      id: CHAIN_ID,
      name: CHAIN_NAME,
      symbol: CHAIN_SYMBOL,
      decimals: CHAIN_DECIMALS,
      explorerUrl: EXPLORER_CONFIG.BASE_URL,
    };
  }

  // Get account explorer URL
  public getAccountExplorerUrl(address: string): string {
    return `${EXPLORER_CONFIG.ACCOUNT_URL}/${address}`;
  }

  // Get transaction explorer URL
  public getTransactionExplorerUrl(txHash: string): string {
    return `${EXPLORER_CONFIG.TX_URL}/${txHash}`;
  }

  // Get token explorer URL
  public getTokenExplorerUrl(tokenAddress: string): string {
    return `${EXPLORER_CONFIG.TOKEN_URL}/${tokenAddress}`;
  }

  // Validate address
  public isValidAddress(address: string): boolean {
    return isValidSeiAddress(address);
  }

  // Get known tokens
  public getKnownTokens() {
    return KNOWN_TOKENS;
  }

  // Get RPC URL
  public getRpcUrl(): string {
    return SEI_RPC_URL;
  }

  // Fetch account balances with caching
  public async getAccountBalances(
    address: string,
    forceRefresh = false,
  ): Promise<SeiBalanceResponse> {
    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        throw new Error(ERROR_MESSAGES.INVALID_ADDRESS);
      }

      // Check cache
      const cached = this.balanceCache.get(address);
      const now = Date.now();
      if (
        !forceRefresh &&
        cached &&
        now - cached.timestamp < 30000 // 30 seconds cache
      ) {
        return cached.data;
      }

      // Fetch balances
      const balances = await fetchBalances(address);

      // Get unique token symbols for price fetching
      const tokens = [...new Set(balances.map((b) => b.token.symbol))];

      // Fetch prices
      const prices = await fetchPrices(tokens);

      // Format response
      const response = formatBalanceResponse(balances, prices);

      // Update cache
      this.balanceCache.set(address, {
        data: response,
        timestamp: now,
      });

      // Update price cache
      Object.entries(prices).forEach(([symbol, data]) => {
        this.priceCache.set(symbol, {
          price: data.price,
          timestamp: now,
        });
      });

      return response;
    } catch (error) {
      logger.error("Error in getAccountBalances:", error);
      throw new Error(parseError(error));
    }
  }

  // Get token price with caching
  public async getTokenPrice(
    symbol: string,
    forceRefresh = false,
  ): Promise<number> {
    try {
      // Check cache
      const cached = this.priceCache.get(symbol);
      const now = Date.now();
      if (
        !forceRefresh &&
        cached &&
        now - cached.timestamp < 60000 // 1 minute cache
      ) {
        return cached.price;
      }

      // Fetch price
      const prices = await fetchPrices([symbol]);
      const price = prices[symbol]?.price || 0;

      // Update cache
      this.priceCache.set(symbol, {
        price,
        timestamp: now,
      });

      return price;
    } catch (error) {
      logger.error("Error in getTokenPrice:", error);
      throw new Error(parseError(error));
    }
  }

  // Clear caches
  public clearCaches(): void {
    this.balanceCache.clear();
    this.priceCache.clear();
  }
}

// Export singleton instance
export const seiChain = SeiChain.getInstance();

// Export types
export type { SeiBalanceResponse, TokenBalance, TokenPrice };

// Export constants
export {
  CHAIN_ID,
  CHAIN_NAME,
  CHAIN_SYMBOL,
  CHAIN_DECIMALS,
  KNOWN_TOKENS,
  EXPLORER_CONFIG,
};
