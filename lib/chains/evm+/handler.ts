import { logger } from "@/lib/utils/core/logger";
import type { TokenBalance, TokenPrice } from "../types";

const SIMPLEHASH_API_URL = "https://api.simplehash.com/api/v0";
const SUPPORTED_CHAINS = [
  "ethereum",
  "polygon",
  "arbitrum",
  "optimism",
  "base",
  "avalanche",
  "bsc",
  "zora",
  "blast",
];

// Chain ID mapping
const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  bsc: 56,
  zora: 7777777,
  blast: 81457,
};

// Reverse mapping for chain names
const CHAIN_NAME_MAP: Record<number, string> = Object.entries(
  CHAIN_ID_MAP,
).reduce((acc, [name, id]) => ({ ...acc, [id]: name }), {});

interface SimpleHashNativeBalance {
  chain: string;
  wallet_address: string;
  balance: string;
  balance_usd_cents: number;
  token: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface SimpleHashTokenBalance {
  chain: string;
  wallet_address: string;
  balance: string;
  balance_usd_cents: number;
  fungible: {
    name: string;
    symbol: string;
    decimals: number;
    contract_address: string;
  };
}

async function fetchFromSimpleHash(
  endpoint: string,
  params: Record<string, string>,
) {
  const apiKey = process.env.SIMPLEHASH_API_KEY;
  if (!apiKey) {
    throw new Error("SimpleHash API key not configured");
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${SIMPLEHASH_API_URL}/${endpoint}?${queryString}`;

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SimpleHash API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

async function fetchBalances(publicKey: string): Promise<TokenBalance[]> {
  try {
    // Fetch both native and token balances in parallel
    const [nativeResponse, tokenResponse] = await Promise.all([
      fetchFromSimpleHash("native_tokens/balances", {
        chains: SUPPORTED_CHAINS.join(","),
        wallet_addresses: publicKey,
        include_prices: "1",
      }),
      fetchFromSimpleHash("fungibles/balances", {
        chains: SUPPORTED_CHAINS.join(","),
        wallet_addresses: publicKey,
        include_prices: "1",
        include_fungible_details: "1",
      }),
    ]);

    const balances: TokenBalance[] = [];

    // Process native token balances
    if (nativeResponse.balances) {
      for (const balance of nativeResponse.balances as SimpleHashNativeBalance[]) {
        const chainId = CHAIN_ID_MAP[balance.chain];
        if (!chainId) continue;

        balances.push({
          token: {
            symbol: balance.token.symbol,
            name: balance.token.name,
            decimals: balance.token.decimals,
            chainId,
            address: "0x0000000000000000000000000000000000000000",
          },
          balance: balance.balance,
          uiAmount:
            parseFloat(balance.balance) / Math.pow(10, balance.token.decimals),
          usdValue: balance.balance_usd_cents
            ? balance.balance_usd_cents / 100
            : undefined,
        });
      }
    }

    // Process ERC20 token balances
    if (tokenResponse.balances) {
      for (const balance of tokenResponse.balances as SimpleHashTokenBalance[]) {
        const chainId = CHAIN_ID_MAP[balance.chain];
        if (!chainId) continue;

        balances.push({
          token: {
            symbol: balance.fungible.symbol,
            name: balance.fungible.name,
            decimals: balance.fungible.decimals,
            chainId,
            address: balance.fungible.contract_address,
          },
          balance: balance.balance,
          uiAmount:
            parseFloat(balance.balance) /
            Math.pow(10, balance.fungible.decimals),
          usdValue: balance.balance_usd_cents
            ? balance.balance_usd_cents / 100
            : undefined,
        });
      }
    }

    return balances;
  } catch (error) {
    logger.error({
      message: "Error fetching balances from SimpleHash",
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: { publicKey },
    });
    throw error;
  }
}

async function fetchPrices(
  tokens: TokenBalance[],
): Promise<Record<string, TokenPrice>> {
  try {
    const prices: Record<string, TokenPrice> = {};

    // Group tokens by chain to minimize API calls
    const tokensByChain: Record<string, string[]> = {};

    for (const token of tokens) {
      const chainName = CHAIN_NAME_MAP[token.token.chainId];
      if (!chainName) continue;

      if (!tokensByChain[chainName]) {
        tokensByChain[chainName] = [];
      }

      if (
        token.token.address !== "0x0000000000000000000000000000000000000000"
      ) {
        tokensByChain[chainName].push(token.token.address);
      }
    }

    // Fetch prices for each chain's tokens
    const pricePromises = Object.entries(tokensByChain).map(
      async ([chain, addresses]) => {
        if (addresses.length === 0) return null;

        const fungibleIds = addresses
          .map((addr) => `${chain}.${addr}`)
          .join(",");
        const response = await fetchFromSimpleHash("fungibles/assets", {
          fungible_ids: fungibleIds,
          include_prices: "1",
        });

        return response;
      },
    );

    const priceResponses = await Promise.all(pricePromises);

    // Process price responses
    for (const response of priceResponses) {
      if (!response?.fungibles) continue;

      for (const fungible of response.fungibles) {
        if (fungible.price_usd) {
          const token = tokens.find(
            (t) =>
              t.token.address.toLowerCase() ===
                fungible.contract_address.toLowerCase() &&
              CHAIN_NAME_MAP[t.token.chainId] === fungible.chain,
          );

          if (token) {
            prices[token.token.symbol] = {
              price: fungible.price_usd,
              priceChange24h: fungible.price_change_24h || 0,
            };
          }
        }
      }
    }

    return prices;
  } catch (error) {
    logger.error({
      message: "Error fetching prices from SimpleHash",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {};
  }
}

export const evmHandlerInstance = {
  chainName: "evm",
  fetchBalances,
  fetchPrices,
};
