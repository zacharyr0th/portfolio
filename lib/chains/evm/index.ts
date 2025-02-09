import { ethers } from "ethers";
import {
  ChainHandler,
  ChainTokenBalance,
  ChainTokenPrice,
  EvmToken,
} from "../types";
import { BaseChainHandler, BaseHandlerConfig } from "../baseHandler";
import { EVM_CHAINS } from "./types";
import { TokenBalance } from "./TokenBalance";
import { logger } from "@/lib/utils/core/logger";
import type { LogMetadata } from "@/lib/utils/core/logger";

// Standard ERC20 ABI for token balance checks
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// Common ERC20 token addresses per chain
const COMMON_TOKENS: Record<number, string[]> = {
  1: [
    // Ethereum
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
    "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
  ],
  137: [
    // Polygon
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC
    "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", // WBTC
    "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", // LINK
  ],
  // Add more chains as needed
};

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const SIMPLEHASH_BASE_URL = "https://api.simplehash.com/api/v0";

// RPC provider cache
const providerCache = new Map<string, ethers.JsonRpcProvider>();

// Get RPC URL for a specific chain
const getRpcUrl = (chain: string): string | null => {
  const envKey = `NEXT_PUBLIC_${chain.toUpperCase()}_RPC_URL`;
  return process.env[envKey] || null;
};

// Get or create RPC provider
const getProvider = (chain: string): ethers.JsonRpcProvider | null => {
  const rpcUrl = getRpcUrl(chain);
  if (!rpcUrl) return null;

  if (!providerCache.has(chain)) {
    providerCache.set(chain, new ethers.JsonRpcProvider(rpcUrl));
  }
  return providerCache.get(chain) || null;
};

// Fetch balances using direct RPC
async function fetchBalancesViaRPC(
  address: string,
  chain: string,
): Promise<{
  balances: ChainTokenBalance[];
  prices: Record<string, ChainTokenPrice>;
}> {
  const provider = getProvider(chain);
  if (!provider) {
    throw new Error(`No RPC provider available for ${chain}`);
  }

  try {
    // Get chain ID for the token
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Fetch native token balance
    const balance = await provider.getBalance(address);
    const nativeSymbol = chain === "eth" ? "ETH" : chain.toUpperCase();

    const balances: ChainTokenBalance[] = [
      {
        token: {
          symbol: nativeSymbol,
          name: nativeSymbol,
          decimals: 18,
          address: "0x0000000000000000000000000000000000000000",
          chainId,
        } as EvmToken,
        balance: balance.toString(),
        uiAmount: Number(ethers.formatEther(balance)),
      },
    ];

    // Also fetch common token balances for this chain
    if (COMMON_TOKENS[chainId]) {
      const tokenPromises = COMMON_TOKENS[chainId].map(async (tokenAddress) => {
        try {
          const contract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider,
          ) as ethers.Contract & {
            balanceOf(owner: string): Promise<bigint>;
            decimals(): Promise<number>;
            symbol(): Promise<string>;
            name(): Promise<string>;
          };

          const [tokenBalance, decimals, symbol, name] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals(),
            contract.symbol(),
            contract.name(),
          ]);

          const uiAmount = Number(tokenBalance) / Math.pow(10, decimals);

          return {
            token: {
              symbol,
              name,
              decimals,
              address: tokenAddress,
              chainId,
            } as EvmToken,
            balance: tokenBalance.toString(),
            uiAmount,
          } as ChainTokenBalance;
        } catch (error) {
          const metadata: LogMetadata = {
            tokenAddress,
            chain,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          };
          logger.warn(
            `Failed to fetch token ${tokenAddress} on chain ${chain}`,
            metadata,
          );
          return null;
        }
      });

      const tokenBalances = (await Promise.all(tokenPromises)).filter(
        (balance): balance is ChainTokenBalance => balance !== null,
      );
      balances.push(...tokenBalances);
    }

    return {
      balances,
      prices: {},
    };
  } catch (error) {
    const metadata: LogMetadata = {
      chain,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    logger.error(`RPC fetch error for ${chain}`, metadata);
    throw error;
  }
}

// Fetch balances from SimpleHash
async function fetchBalancesViaSimpleHash(
  address: string,
  chain: string,
): Promise<{
  balances: ChainTokenBalance[];
  prices: Record<string, ChainTokenPrice>;
}> {
  if (!SIMPLEHASH_API_KEY) {
    throw new Error("SimpleHash API key not configured");
  }

  const chainName = chain === "eth" ? "ethereum" : chain;
  const chainConfig = EVM_CHAINS[chainName as keyof typeof EVM_CHAINS];
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }

  try {
    // Fetch both fungible token balances and native token balance from SimpleHash API
    const [fungibleResponse, nativeResponse] = await Promise.all([
      // Get fungible token balances
      fetch(
        `${SIMPLEHASH_BASE_URL}/fungibles/balances?chains=${chainName}&wallet_addresses=${address}&include_prices=1`,
        {
          headers: {
            "X-API-KEY": SIMPLEHASH_API_KEY,
            Accept: "application/json",
          },
        },
      ),
      // Get native token balance
      fetch(
        `${SIMPLEHASH_BASE_URL}/native_tokens/balances?chains=${chainName}&wallet_addresses=${address}`,
        {
          headers: {
            "X-API-KEY": SIMPLEHASH_API_KEY,
            Accept: "application/json",
          },
        },
      ),
    ]);

    if (!fungibleResponse.ok || !nativeResponse.ok) {
      const error = new Error(
        `SimpleHash API error: ${fungibleResponse.status}/${nativeResponse.status}`,
      );
      logger.error(error.message, error);
      throw error;
    }

    const [fungibleData, nativeData] = await Promise.all([
      fungibleResponse.json(),
      nativeResponse.json(),
    ]);

    const balances: ChainTokenBalance[] = [];
    const prices: Record<string, ChainTokenPrice> = {};

    // Add native token balance
    if (nativeData.native_tokens?.[0]) {
      const native = nativeData.native_tokens[0];
      balances.push({
        token: {
          symbol: native.symbol || chainName.toUpperCase(),
          name: native.name || chainName.toUpperCase(),
          decimals: 18,
          address: "0x0000000000000000000000000000000000000000",
          chainId: chainConfig.chainId,
        } as EvmToken,
        balance: native.amount,
        uiAmount: Number(native.amount) / Math.pow(10, 18),
      });

      if (native.usd_value_cents) {
        prices["0x0000000000000000000000000000000000000000"] = {
          price: native.usd_value_cents / 100,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Add fungible token balances
    if (fungibleData.fungibles) {
      fungibleData.fungibles.forEach((token: any) => {
        balances.push({
          token: {
            symbol: token.symbol || "",
            name: token.name || "",
            decimals: token.decimals || 18,
            address: token.contract_address,
            chainId: chainConfig.chainId,
          } as EvmToken,
          balance: token.amount,
          uiAmount: Number(token.amount) / Math.pow(10, token.decimals || 18),
        });

        if (token.usd_value_cents) {
          prices[token.contract_address] = {
            price: token.usd_value_cents / 100,
            updatedAt: new Date().toISOString(),
          };
        }
      });
    }

    return { balances, prices };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(err.message, err);
    throw err;
  }
}

export async function fetchBalances(address: string, chain: string) {
  try {
    // Only use SimpleHash - no RPC fallback needed since SimpleHash provides all the data we need
    return await fetchBalancesViaSimpleHash(address, chain);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(err.message, err);
    throw err;
  }
}

// Create EVM handler instance
const evmHandlerInstance = new BaseChainHandler({
  chainName: "evm",
  fetchBalancesImpl: async (publicKey: string, accountId: string) => {
    // Normalize chain name by removing -main suffix and handling eth alias
    const chainName =
      accountId?.split("-")?.[0]?.replace("eth", "ethereum") || "ethereum";
    const chainConfig = EVM_CHAINS[chainName as keyof typeof EVM_CHAINS];

    if (!chainConfig) {
      logger.warn(
        `Unsupported EVM chain: ${accountId} (normalized: ${chainName})`,
      );
      return { balances: [] };
    }

    try {
      // Use our new fetchBalances implementation that handles both SimpleHash and RPC
      return await fetchBalances(publicKey, chainName);
    } catch (error) {
      logger.error("Error fetching balances", {
        error: error instanceof Error ? error.message : String(error),
        chain: chainConfig.name,
        publicKey,
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },
  fetchPricesImpl: async () => {
    // Prices are now included in the balance response
    return {};
  },
  getExplorerUrlImpl: (publicKey: string, accountId: string) => {
    const chainName =
      accountId?.split("-")?.[0]?.replace("eth", "ethereum") || "ethereum";
    const chainConfig = EVM_CHAINS[chainName as keyof typeof EVM_CHAINS];
    if (!chainConfig) throw new Error(`Unsupported chain: ${chainName}`);
    return `${chainConfig.explorerUrl}/address/${publicKey}`;
  },
  BalanceDisplayComponent: TokenBalance,
});

// Export the handler interface
export const evmHandler: ChainHandler = evmHandlerInstance;

// Export cleanup function for tests and hot reloading
export const clearCache = () => evmHandlerInstance.clearCache();
