import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const SIMPLEHASH_BASE_URL = "https://api.simplehash.com/api/v0";
const MAX_TOKENS_PER_REQUEST = 100;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    logger.debug(`Fetching Solana balances for address ${address}`);

    if (!address?.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      return NextResponse.json(
        { error: "Invalid Solana address" },
        { status: 400 },
      );
    }

    if (!SIMPLEHASH_API_KEY) {
      logger.error("SimpleHash API key not configured");
      throw new Error("SimpleHash API key not configured");
    }

    const headers = {
      Accept: "application/json",
      "X-API-KEY": SIMPLEHASH_API_KEY,
    };

    // Fetch native SOL balance
    const nativeRes = await fetch(
      `${SIMPLEHASH_BASE_URL}/native_tokens/balances?chains=solana&wallet_addresses=${address}&include_prices=1`,
      {
        headers,
        next: { revalidate: 60 },
      },
    );

    if (!nativeRes.ok) {
      throw new Error(`SimpleHash API error: ${nativeRes.status}`);
    }

    const nativeData = await nativeRes.json();
    logger.debug("Raw native SOL response:", {
      native_tokens: nativeData.native_tokens,
      price_data: nativeData.native_tokens?.[0]?.price_usd_cents,
      total_quantity: nativeData.native_tokens?.[0]?.total_quantity_string,
    });

    const balances = [];
    const prices: Record<string, { price: number; timestamp: number }> = {};

    // Process native SOL
    if (nativeData.native_tokens) {
      for (const token of nativeData.native_tokens) {
        if (token.total_quantity_string) {
          try {
            // SOL has 9 decimals
            const rawAmount = token.total_quantity_string;
            const decimals = 9;
            const uiAmount =
              Number(token.total_quantity_string) / Math.pow(10, decimals);

            // Skip if amount is invalid
            if (!Number.isFinite(uiAmount)) {
              logger.warn("Invalid token amount", {
                token: "SOL",
                amount: rawAmount,
                decimals,
              });
              continue;
            }

            // Get price directly from the API response
            if (token.total_value_usd_cents) {
              prices["SOL"] = {
                price: token.total_value_usd_cents / (100 * uiAmount),
                timestamp: Date.now(),
              };
            }

            balances.push({
              token: {
                symbol: "SOL",
                name: "Solana",
                decimals: decimals,
                address: "So11111111111111111111111111111111111111111",
                verified: true,
              },
              balance: rawAmount,
              uiAmount,
            });
          } catch (error) {
            logger.error("Error processing native SOL balance", {
              error: error instanceof Error ? error.message : String(error),
              token: "SOL",
            });
          }
        }
      }
    }

    // Fetch all SPL tokens with pagination
    let cursor = null;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      pageCount++;
      const url = new URL(`${SIMPLEHASH_BASE_URL}/fungibles/balances`);
      url.searchParams.append("chains", "solana");
      url.searchParams.append("wallet_addresses", address);
      url.searchParams.append("include_fungible_details", "1");
      url.searchParams.append("include_prices", "1");
      url.searchParams.append("limit", MAX_TOKENS_PER_REQUEST.toString());
      if (cursor) {
        url.searchParams.append("cursor", cursor);
      }

      logger.debug("Fetching SPL tokens", {
        page: pageCount,
        url: url.toString(),
      });

      const fungibleRes = await fetch(url.toString(), {
        headers,
        next: { revalidate: 60 },
      });

      if (!fungibleRes.ok) {
        throw new Error(`SimpleHash API error: ${fungibleRes.status}`);
      }

      const fungibleData = await fungibleRes.json();
      logger.debug("Raw SPL token response:", fungibleData);
      logger.debug(`Page ${pageCount} response:`, fungibleData);

      // Process SPL tokens
      if (fungibleData.fungibles) {
        for (const token of fungibleData.fungibles) {
          if (token.total_quantity_string) {
            try {
              const rawAmount = token.total_quantity_string;
              const decimals = token.decimals || 9;
              const uiAmount =
                Number(token.total_quantity_string) / Math.pow(10, decimals);

              // Skip if amount is invalid
              if (!Number.isFinite(uiAmount)) {
                logger.warn("Invalid token amount", {
                  token: token.symbol,
                  amount: rawAmount,
                  decimals,
                });
                continue;
              }

              // Get price directly from the API response
              if (token.total_value_usd_cents) {
                prices[token.symbol] = {
                  price: token.total_value_usd_cents / (100 * uiAmount),
                  timestamp: Date.now(),
                };
              }

              balances.push({
                token: {
                  symbol: token.symbol || "",
                  name: token.name || "",
                  decimals: decimals,
                  address: token.contract_address,
                  verified: token.verified || false,
                },
                balance: rawAmount,
                uiAmount,
              });
            } catch (error) {
              logger.error("Error processing SPL token", {
                error: error instanceof Error ? error.message : String(error),
                tokenId: token.fungible_id,
              });
              continue;
            }
          }
        }
      }

      // Check if there are more pages
      cursor = fungibleData.next;
      hasMore = !!cursor && pageCount < 5; // Limit to 5 pages for now
    }

    logger.debug(`Found ${balances.length} total tokens`);

    // Sort balances by value
    balances.sort((a, b) => {
      const aValue = (prices[a.token.symbol]?.price || 0) * a.uiAmount;
      const bValue = (prices[b.token.symbol]?.price || 0) * b.uiAmount;
      return bValue - aValue;
    });

    return NextResponse.json({ balances, prices });
  } catch (error) {
    logger.error(
      "Error fetching Solana balances:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
