import { NFTBalance } from "@/lib/data/simplehash";
import { logger } from "@/lib/utils/core/logger";

interface SuiNFTResponse {
  nfts: NFTBalance[];
  error?: string;
}

async function fetchNFTsFromSimpleHash(address: string): Promise<NFTBalance[]> {
  const apiKey = process.env.SIMPLEHASH_API_KEY;
  if (!apiKey) {
    throw new Error("SIMPLEHASH_API_KEY not configured");
  }

  try {
    logger.info("Fetching Sui NFTs from SimpleHash", { address });
    const response = await fetch(
      `https://api.simplehash.com/api/v0/nfts/owners_v2?chains=sui&wallet_addresses=${address}`,
      {
        headers: {
          "X-API-KEY": apiKey,
          Accept: "application/json",
        },
      },
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch NFTs");
    }

    logger.info("Successfully fetched Sui NFTs", {
      count: data.nfts?.length || 0,
      address,
    });
    return data.nfts || [];
  } catch (error) {
    logger.error(
      "Failed to fetch Sui NFTs from SimpleHash",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

export async function getSuiNFTs(address: string): Promise<SuiNFTResponse> {
  try {
    const nfts = await fetchNFTsFromSimpleHash(address);
    return { nfts };
  } catch (error) {
    logger.error(
      "Error in getSuiNFTs",
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      nfts: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
