import type { TokenBalance } from "./types";
import { logger } from "@/lib/utils/core/logger";
import { TOKEN_SYMBOL_MAP, RPC_ENDPOINTS } from "./constants";
import { chainInfo } from "../config";

// RPC configuration
const RPC_CONFIG = {
  HEALTH_CHECK_TIMEOUT: 5000,
  REQUEST_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
} as const;

// RPC cache
interface RpcCache {
  url: string;
  timestamp: number;
  health: boolean;
}

const rpcCache = new Map<string, RpcCache>();

// Get RPC URL with fallback mechanism and caching
async function getWorkingRpcUrl(): Promise<string> {
  const now = Date.now();

  // Check cache first
  for (const [url, cache] of rpcCache.entries()) {
    if (now - cache.timestamp < RPC_CONFIG.CACHE_TTL && cache.health) {
      return url;
    }
  }

  // Helper function to check RPC health
  async function checkRpcHealth(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        RPC_CONFIG.HEALTH_CHECK_TIMEOUT,
      );

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (err) {
      return false;
    }
  }

  // Try configured RPC first
  const configuredRpc = chainInfo.aptos.rpcEndpoint;
  if (configuredRpc) {
    const isHealthy = await checkRpcHealth(configuredRpc);
    rpcCache.set(configuredRpc, {
      url: configuredRpc,
      timestamp: now,
      health: isHealthy,
    });

    if (isHealthy) {
      return configuredRpc;
    }
    logger.warn(
      `Configured RPC ${configuredRpc} is not responding, trying fallbacks`,
    );
  }

  // Try fallback RPCs
  for (const rpc of RPC_ENDPOINTS) {
    const isHealthy = await checkRpcHealth(rpc);
    rpcCache.set(rpc, { url: rpc, timestamp: now, health: isHealthy });

    if (isHealthy) {
      return rpc;
    }
    logger.warn(`Fallback RPC ${rpc} is not responding`);
  }

  throw new Error("No working RPC endpoint found");
}

// Known token decimals with validation
const TOKEN_DECIMALS: Readonly<Record<string, number>> = Object.freeze({
  APT: 8,
  USDC: 6,
  USDT: 6,
  WETH: 8,
  WBTC: 8,
});

// Validate and normalize RPC response
function validateRpcResponse(response: unknown): boolean {
  if (!response || typeof response !== "object") {
    return false;
  }
  // Add more validation as needed
  return true;
}

// Update the RPC request function with retries and timeouts
async function makeRpcRequest<T>(
  endpoint: string,
  params: any = {},
): Promise<T> {
  let retries = RPC_CONFIG.MAX_RETRIES as number;

  while (retries > -1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        RPC_CONFIG.REQUEST_TIMEOUT,
      );

      const response = await fetch("/api/aptos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint,
          ...params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!validateRpcResponse(data)) {
        throw new Error("Invalid RPC response format");
      }

      return data as T;
    } catch (error) {
      if (retries === 0) {
        throw error;
      }

      logger.warn(
        `RPC request failed, retrying... (${RPC_CONFIG.MAX_RETRIES - retries + 1}/${RPC_CONFIG.MAX_RETRIES})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, RPC_CONFIG.RETRY_DELAY),
      );
      retries--;
    }
  }

  throw new Error("RPC request failed after all retries");
}

interface AptosResource {
  type: string;
  data: {
    coin?: {
      value: string;
    };
  };
}

export async function fetchAptosAccountResources(
  publicKey: string,
): Promise<{ balances: TokenBalance[] }> {
  try {
    const resources = await makeRpcRequest<AptosResource[]>(
      `/accounts/${publicKey}/resources`,
    );
    const balances: TokenBalance[] = [];
    let hasNativeApt = false;

    // Process resources to extract token balances
    for (const resource of resources) {
      try {
        if (resource.type.includes("0x1::coin::CoinStore")) {
          const tokenType = resource.type.match(
            /0x1::coin::CoinStore<(.+)>/,
          )?.[1];
          if (!tokenType) continue;

          // Get token info from symbol map
          const tokenInfo = Object.entries(TOKEN_SYMBOL_MAP).find(
            ([type]) => type === tokenType || tokenType.includes(type),
          )?.[1];

          if (!tokenInfo) continue;

          const amount = resource.data.coin?.value;
          if (!amount || isNaN(Number(amount))) continue;

          // Skip if we already have native APT and this is another APT variant
          if (tokenInfo.symbol === "APT") {
            if (hasNativeApt) continue;
            if (tokenType === "0x1::aptos_coin::AptosCoin") {
              hasNativeApt = true;
            } else {
              continue;
            }
          }

          balances.push({
            token: {
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              decimals: tokenInfo.decimals,
              tokenAddress: tokenType,
            },
            balance: amount,
          });
        }
      } catch (err) {
        logger.warn(
          `Error processing resource: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    // Add STAPT balance if present
    const staptValue = getStaptValue(resources);
    if (staptValue > 0) {
      balances.push({
        token: {
          symbol: "STAPT",
          name: "Staked Aptos",
          decimals: TOKEN_DECIMALS["STAPT"] || 8,
          tokenAddress:
            "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt",
        },
        balance: staptValue.toString(),
      });
    }

    return { balances };
  } catch (error) {
    logger.error(
      `Error fetching Aptos resources: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

// Calculate STAPT value from resources
export function getStaptValue(resources?: AptosResource[]): number {
  if (!resources?.length) return 0;

  const staptResource = resources.find(
    (r) =>
      r.type ===
      "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt",
  );

  if (!staptResource?.data?.coin?.value) return 0;

  const rawValue = Number(staptResource.data.coin.value);
  if (isNaN(rawValue) || !isFinite(rawValue)) return 0;

  // Use the known decimal value from TOKEN_DECIMALS constant
  const decimals = TOKEN_DECIMALS["STAPT"] || 8; // Default to 8 if not found
  return rawValue / Math.pow(10, decimals);
}
