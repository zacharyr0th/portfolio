import { chainInfo } from "../config";
import { fetchTokenPrices } from "@/lib/data/cmc";
import type {
  TokenBalance,
  TokenPrice,
  SolanaAccountInfo,
  TokenAccount,
  SolanaToken,
} from "./types";
import type { ChainHandler } from "../types";
import { BaseChainHandler } from "../baseHandler";
import { logger } from "@/lib/utils/core/logger";
import { SolanaTokenBalance } from "./TokenBalance";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_SOL_MINT,
  USDC_MINT,
  USDT_MINT,
  DEFAULT_PRICE,
} from "./constants";

// Helper function to make RPC requests with retries
async function makeRpcRequest<T>(method: string, params: any[]): Promise<T> {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("/api/solana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params }),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            retryAfter ? parseInt(retryAfter) * 1000 : retryDelay,
          ),
        );
        continue;
      }

      if (!response.ok) {
        logger.warn(`Solana RPC request failed`, {
          status: response.status,
          method,
          attempt,
        });
        throw new Error(`Solana API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        logger.warn(`Solana RPC response error`, {
          error: data.error,
          method,
          attempt,
        });
        throw new Error(
          `Solana RPC error: ${data.error.message || JSON.stringify(data.error)}`,
        );
      }

      return data.result as T;
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error(
          `Solana RPC request failed after ${maxRetries} attempts`,
          error instanceof Error ? error : new Error(String(error)),
          { method },
        );
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error("Max retries exceeded");
}

// Create Solana handler instance
const solanaHandlerInstance = new BaseChainHandler({
  chainName: "solana",
  fetchBalancesImpl: async (publicKey: string, accountId: string) => {
    if (!publicKey?.trim()) {
      logger.warn("No public key provided for Solana balance fetch");
      return { balances: [] };
    }

    try {
      logger.debug(`Fetching balances for Solana address: ${publicKey}`);

      // Fetch SOL balance
      const accountInfo = await makeRpcRequest<{
        value: SolanaAccountInfo | null;
      }>("getAccountInfo", [
        publicKey,
        { encoding: "jsonParsed", commitment: "confirmed" },
      ]);

      // Fetch token accounts
      const tokenAccounts = await makeRpcRequest<{ value: TokenAccount[] }>(
        "getTokenAccountsByOwner",
        [
          publicKey,
          { programId: TOKEN_PROGRAM_ID },
          { encoding: "jsonParsed", commitment: "confirmed" },
        ],
      );

      const balances: TokenBalance[] = [];
      const tokenAddresses: string[] = [];

      // Add SOL balance
      if (accountInfo?.value) {
        const lamports = accountInfo.value.lamports;
        // Only add SOL balance if it's greater than 0.000001 SOL (dust threshold)
        if (lamports > 1000) {
          const solToken: SolanaToken = {
            symbol: "SOL",
            name: "Solana",
            decimals: 9,
            tokenAddress: NATIVE_SOL_MINT,
            isNative: true,
          };
          // Add native SOL balance first
          balances.unshift({
            token: solToken,
            balance: lamports.toString(),
            uiAmount: lamports / Math.pow(10, 9),
            valueUsd: 0, // Will be updated with price data
          });
          tokenAddresses.push(NATIVE_SOL_MINT);
        }
      }

      // Add token balances
      if (tokenAccounts?.value) {
        for (const account of tokenAccounts.value) {
          try {
            const { parsed } = account.account.data;
            if (parsed.type !== "account") continue;

            const { info } = parsed;
            const { mint, tokenAmount } = info;

            // Skip wrapped SOL to avoid duplication with native SOL
            if (mint === NATIVE_SOL_MINT) continue;

            const amount = parseFloat(tokenAmount.amount);
            // Filter out dust amounts based on token
            const minAmount =
              mint === USDC_MINT || mint === USDT_MINT
                ? Math.pow(10, tokenAmount.decimals - 2) // $0.01 for stablecoins
                : Math.pow(10, tokenAmount.decimals - 6); // 0.000001 for other tokens

            if (amount > minAmount) {
              // Get token metadata from the chain
              const tokenMetadata = await makeRpcRequest<any>(
                "getTokenSupply",
                [mint],
              );
              const symbol = tokenMetadata?.symbol || mint.slice(0, 6) + "...";
              const name = tokenMetadata?.name || symbol;

              const token: SolanaToken = {
                symbol,
                name,
                decimals: tokenAmount.decimals,
                tokenAddress: mint,
              };

              balances.push({
                token,
                balance: tokenAmount.amount,
                uiAmount: amount / Math.pow(10, tokenAmount.decimals),
                valueUsd: 0, // Will be updated with price data
              });
              tokenAddresses.push(mint);
            }
          } catch (err) {
            logger.warn("Error processing token account", {
              error: err instanceof Error ? err.message : String(err),
            });
            continue;
          }
        }
      }

      // Fetch prices for all tokens
      const response = await fetch(
        `/api/solana?tokens=${tokenAddresses.join(",")}&showExtraInfo=true`,
      );
      if (response.ok) {
        const { prices } = (await response.json()) as {
          prices: Record<string, TokenPrice>;
        };

        // Update balances with USD values
        for (const balance of balances) {
          const price = prices[balance.token.tokenAddress];
          if (price) {
            balance.valueUsd = balance.uiAmount * price.price;
          } else if (
            balance.token.tokenAddress === USDC_MINT ||
            balance.token.tokenAddress === USDT_MINT
          ) {
            balance.valueUsd = balance.uiAmount; // Stablecoins 1:1
          }
        }

        // Sort balances by USD value
        balances.sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
      }

      return { balances };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error fetching Solana balances", err);
      throw error;
    }
  },
  fetchPricesImpl: async () => {
    try {
      // Get token addresses from current balances
      const balances = await solanaHandlerInstance.fetchBalances("", "");
      const tokenAddresses = balances.balances.map((b) => b.token.tokenAddress);
      const tokenSymbols = balances.balances.map((b) => b.token.symbol);

      if (tokenAddresses.length === 0) {
        return {};
      }

      // Try Jupiter first
      const response = await fetch(
        `/api/solana?tokens=${tokenAddresses.join(",")}&showExtraInfo=true`,
      );
      const tokenPrices: Record<string, TokenPrice> = {};

      if (response.ok) {
        const { prices } = (await response.json()) as {
          prices: Record<string, TokenPrice>;
        };

        // Process each token's price
        for (const balance of balances.balances) {
          const priceData = prices[balance.token.tokenAddress];
          if (priceData) {
            tokenPrices[balance.token.symbol] = priceData;
          }
        }
      }

      // Fetch CMC prices as fallback for missing prices
      const missingSymbols = tokenSymbols.filter(
        (symbol) =>
          !tokenPrices[symbol] && symbol !== "USDC" && symbol !== "USDT",
      );
      if (missingSymbols.length > 0) {
        const cmcPrices = await fetchTokenPrices(missingSymbols);

        for (const symbol of missingSymbols) {
          if (cmcPrices?.[symbol]) {
            tokenPrices[symbol] = {
              price: cmcPrices[symbol].price || 0,
              priceChange24h: cmcPrices[symbol].percent_change_24h || 0,
              lastUpdated: Date.now(),
              confidence: 0.8, // Lower confidence for CMC prices
            };
          }
        }
      }

      // Handle stablecoins
      for (const balance of balances.balances) {
        if (
          !tokenPrices[balance.token.symbol] &&
          (balance.token.tokenAddress === USDC_MINT ||
            balance.token.tokenAddress === USDT_MINT)
        ) {
          tokenPrices[balance.token.symbol] = {
            price: 1,
            priceChange24h: 0,
            lastUpdated: Date.now(),
            confidence: 1,
          };
        } else if (!tokenPrices[balance.token.symbol]) {
          tokenPrices[balance.token.symbol] = DEFAULT_PRICE;
        }
      }

      return tokenPrices;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error fetching token prices", err);
      return {};
    }
  },
  getExplorerUrlImpl: (publicKey: string, accountId: string) => {
    const chain = chainInfo["solana"];
    return `${chain.explorer}/account/${publicKey}`;
  },
  BalanceDisplayComponent: SolanaTokenBalance,
});

// Export the handler interface
export const solanaHandler: ChainHandler = solanaHandlerInstance;

// Export cleanup function for tests and hot reloading
export const clearCache = () => solanaHandlerInstance.clearCache();
