import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";

const SUI_RPC_URL = process.env.SUI_RPC_URL;

// Cache for price data
const priceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coinType = searchParams.get("coinType");

    if (!coinType) {
      return NextResponse.json(
        { error: "Missing coinType parameter" },
        { status: 400 },
      );
    }

    if (!SUI_RPC_URL) {
      throw new Error("SUI_RPC_URL not configured");
    }

    // Check cache first
    const now = Date.now();
    const cached = priceCache.get(coinType);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // For native SUI token
    if (coinType === "0x2::sui::SUI") {
      // Get total supply
      const supplyResponse = await fetch(SUI_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getTotalSupply",
          params: [],
        }),
      });

      if (!supplyResponse.ok) {
        throw new Error(
          `Failed to fetch supply data: ${supplyResponse.status}`,
        );
      }

      const supplyData = await supplyResponse.json();

      // Get latest checkpoint for transaction data
      const checkpointResponse = await fetch(SUI_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "sui_getLatestCheckpointSequenceNumber",
          params: [],
        }),
      });

      if (!checkpointResponse.ok) {
        throw new Error(
          `Failed to fetch checkpoint data: ${checkpointResponse.status}`,
        );
      }

      const checkpointData = await checkpointResponse.json();

      // Calculate basic metrics
      const totalSupply = parseInt(supplyData.result.activeValidators) || 0;
      const priceData = {
        price: 0, // Would need external price feed
        totalSupply,
        checkpoint: checkpointData.result,
        timestamp: now,
      };

      // Cache the result
      priceCache.set(coinType, { data: priceData, timestamp: now });
      return NextResponse.json(priceData);
    }

    // For other tokens, we would need to implement custom price feeds
    // For now, return zero values
    const defaultData = {
      price: 0,
      priceChange24h: 0,
      volume24h: 0,
      marketCap: 0,
      timestamp: now,
    };

    // Cache the result
    priceCache.set(coinType, { data: defaultData, timestamp: now });
    return NextResponse.json(defaultData);
  } catch (error) {
    logger.error("Error fetching Sui token data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch token data",
      },
      { status: 500 },
    );
  }
}
