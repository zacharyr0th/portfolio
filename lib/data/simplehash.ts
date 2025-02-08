import { createCache } from "@/lib/utils/core/performance";
import { logger } from "@/lib/utils/core/logger";

// Types
export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface NFTCollection {
  name: string;
  description: string;
  image_url: string;
}

export interface NFTFloorPrice {
  value: number;
  currency: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image_url: string;
  collection: NFTCollection;
  attributes: NFTAttribute[];
}

export interface NFTBalance {
  token_id: string;
  contract_address: string;
  chain: string;
  name: string;
  description: string;
  image_url: string;
  collection: NFTCollection;
  floor_price?: NFTFloorPrice;
  price_info?: {
    price_amount?: number;
    price_currency?: string;
    price_usd?: number;
  };
}

// Add new interface for fetch options
export interface FetchWalletNFTsOptions {
  queried_wallet_balances?: boolean;
  collection_ids?: string[];
  contract_ids?: string[];
  filters?: {
    spam_score__lte?: number;
    spam_score__gte?: number;
    spam_score__lt?: number;
    spam_score__gt?: number;
  };
  excluded_contract_ids?: string[];
  include_escrowed_nfts?: boolean;
  include_attribute_percentages?: boolean;
  count?: boolean;
  cursor?: string;
  order_by?: "transfer_time__desc" | "transfer_time__asc" | string;
  limit?: number;
}

// Constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const BASE_URL = "https://api.simplehash.com/api/v0";

// Chain mapping - only chains fully supported by SimpleHash for NFTs
const CHAIN_MAPPING = {
  // Layer 1s
  ethereum: "ethereum",
  solana: "solana",
  bitcoin: "bitcoin",
  utxo: "utxo", // Bitcoin Rare Sats
  tezos: "tezos",
  aptos: "aptos",
  flow: "flow",
  flow_evm: "flow-evm",

  // EVM Layer 2s & Sidechains
  polygon: "polygon",
  arbitrum: "arbitrum",
  arbitrum_nova: "arbitrum-nova",
  avalanche: "avalanche",
  base: "base",
  blast: "blast",
  bsc: "bsc",
  canto: "canto",
  celo: "celo",
  fantom: "fantom",
  gnosis: "gnosis", // POAP contract only
  immutable_zkevm: "immutable-zkevm",
  linea: "linea",
  manta: "manta",
  mantle: "mantle",
  mode: "mode",
  moonbeam: "moonbeam",
  opbnb: "opbnb",
  optimism: "optimism",
  palm: "palm",
  polygon_zkevm: "polygon-zkevm",
  scroll: "scroll",
  zksync_era: "zksync-era",
  zora: "zora",
} as const;

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxItems: 1000,
  namespace: "nft-data",
} as const;

// Initialize cache
const cache = createCache(CACHE_CONFIG);

// Helper: Delay between retries
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Retry operation with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      await delay(delayMs);
      return retryOperation(operation, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

// Helper: Make API request with timeout
async function makeRequest<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    console.log("Making SimpleHash API request:", { url });
    const response = await fetch(url, {
      headers: {
        "X-API-KEY": process.env.SIMPLEHASH_API_KEY || "",
        Accept: "application/json",
      },
      signal: controller.signal,
      next: { revalidate: CACHE_TTL / 1000 },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("SimpleHash API error response:", {
        status: response.status,
        error: errorData,
      });
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();
    console.log("SimpleHash API response:", {
      status: response.status,
      dataSize: JSON.stringify(data).length,
    });
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper: Get chain identifier
function getChainIdentifier(chain: string): string {
  const mappedChain =
    CHAIN_MAPPING[chain.toLowerCase() as keyof typeof CHAIN_MAPPING];
  if (!mappedChain) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return mappedChain;
}

// Update fetchWalletNFTs function
export async function fetchWalletNFTs(
  walletAddress: string,
  chain: string,
  options: FetchWalletNFTsOptions = {},
): Promise<NFTBalance[]> {
  const chainId = getChainIdentifier(chain);
  const cacheKey = `nfts-${chainId}-${walletAddress}-${JSON.stringify(options)}`;

  try {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached as NFTBalance[];
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      chains: chainId,
      wallet_addresses: walletAddress,
    });

    // Add optional parameters
    if (options.queried_wallet_balances)
      queryParams.append("queried_wallet_balances", "1");
    if (options.collection_ids?.length)
      queryParams.append("collection_ids", options.collection_ids.join(","));
    if (options.contract_ids?.length)
      queryParams.append("contract_ids", options.contract_ids.join(","));
    if (options.excluded_contract_ids?.length)
      queryParams.append(
        "excluded_contract_ids",
        options.excluded_contract_ids.join(","),
      );
    if (options.include_escrowed_nfts)
      queryParams.append("include_escrowed_nfts", "1");
    if (options.include_attribute_percentages)
      queryParams.append("include_attribute_percentages", "1");
    if (options.count) queryParams.append("count", "1");
    if (options.cursor) queryParams.append("cursor", options.cursor);
    if (options.order_by) queryParams.append("order_by", options.order_by);
    if (options.limit) queryParams.append("limit", options.limit.toString());

    // Add filters if present
    if (options.filters) {
      const filterStrings: string[] = [];
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          filterStrings.push(`${key}=${value}`);
        }
      });
      if (filterStrings.length) {
        queryParams.append("filters", filterStrings.join(","));
      }
    }

    // Fetch from API with retry
    const response = await retryOperation(() =>
      makeRequest<{ nfts: any[] }>(
        `${BASE_URL}/nfts/owners_v2?${queryParams.toString()}`,
      ),
    );

    // Transform and normalize data
    const nfts: NFTBalance[] = response.nfts.map((nft) => ({
      token_id: nft.token_id,
      contract_address: nft.contract_address,
      chain: nft.chain,
      name: nft.name || "",
      description: nft.description || "",
      image_url: nft.image_url || "",
      collection: {
        name: nft.collection?.name || "",
        description: nft.collection?.description || "",
        image_url: nft.collection?.image_url || "",
      },
      floor_price: nft.collection?.floor_price
        ? {
            value: Number(nft.collection.floor_price.value),
            currency: nft.collection.floor_price.currency,
          }
        : undefined,
      price_info:
        nft.chain === "aptos" && nft.price_info
          ? {
              price_amount: Number(nft.price_info.price_amount),
              price_currency: nft.price_info.price_currency,
              price_usd: Number(nft.price_info.price_usd),
            }
          : undefined,
    }));

    // Cache the results
    cache.set(cacheKey, nfts, CACHE_TTL);
    return nfts;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error fetching NFTs";
    logger.error(
      "Error fetching NFTs",
      error instanceof Error ? error : undefined,
      {
        wallet: walletAddress,
        chain: chainId,
        options,
      },
    );
    throw error;
  }
}

// Fetch specific NFT metadata
export async function fetchNFTMetadata(
  contractAddress: string,
  tokenId: string,
  chain: string,
): Promise<NFTMetadata> {
  const chainId = getChainIdentifier(chain);
  const cacheKey = `nft-metadata-${chainId}-${contractAddress}-${tokenId}`;

  try {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && typeof cached === "object" && "name" in cached) {
      return cached as NFTMetadata;
    }

    // Fetch from API with retry
    const response = await retryOperation(() =>
      makeRequest<any>(
        `${BASE_URL}/nfts/${chainId}/${contractAddress}/${tokenId}`,
      ),
    );

    // Transform and normalize data
    const metadata: NFTMetadata = {
      name: response.name || "",
      description: response.description || "",
      image_url: response.image_url || "",
      collection: {
        name: response.collection?.name || "",
        description: response.collection?.description || "",
        image_url: response.collection?.image_url || "",
      },
      attributes:
        response.attributes?.map((attr: any) => ({
          trait_type: attr.trait_type || "",
          value: String(attr.value || ""),
        })) || [],
    };

    // Cache the results
    cache.set(cacheKey, metadata, CACHE_TTL);
    return metadata;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error fetching NFT metadata";
    logger.error(
      "Error fetching NFT metadata",
      error instanceof Error ? error : undefined,
      {
        contract: contractAddress,
        tokenId,
        chain: chainId,
      },
    );
    throw error;
  }
}
