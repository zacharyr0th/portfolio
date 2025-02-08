import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import { formatUnits } from "ethers";
import { CHAIN_CONFIG, isEvmChain } from "@/lib/chains/constants";

interface SimpleHashToken {
  symbol: string;
  price_usd_cents: number;
  total_quantity_string: string;
  decimals?: number;
  name?: string;
  verified?: boolean;
  contract_address: string;
  fungible_id: string;
  total_value_usd_cents?: number;
}

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const SIMPLEHASH_BASE_URL = "https://api.simplehash.com/api/v0";
const MAX_TOKENS_PER_REQUEST = 100;

// Map chain names to SimpleHash chain identifiers
const CHAIN_MAPPING: Record<string, string> = {
  ethereum: "ethereum",
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
  gnosis: "gnosis",
  linea: "linea",
  manta: "manta",
  mantle: "mantle",
  mode: "mode",
  moonbeam: "moonbeam",
  opbnb: "opbnb",
  optimism: "optimism",
  polygon_zkevm: "polygon-zkevm",
  scroll: "scroll",
  zksync_era: "zksync-era",
  zora: "zora",
  abstract: "abstract",
  apechain: "apechain",
  b3: "b3",
  cyber: "cyber",
  degen: "degen",
  forma: "forma",
  godwoken: "godwoken",
  immutable_zkevm: "immutable-zkevm",
  loot: "loot",
  proof_of_play: "proof-of-play",
  proof_of_play_boss: "proof-of-play-boss",
  rari: "rari",
  soneium: "soneium",
  saakuru: "saakuru",
  shape: "shape",
  treasure: "treasure",
  xai: "xai",
  palm: "palm",
};

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chainParam = searchParams.get("chain")?.toLowerCase();

    if (!address?.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    if (!SIMPLEHASH_API_KEY) {
      logger.error("SimpleHash API key not configured");
      throw new Error("SimpleHash API key not configured");
    }

    if (!chainParam) {
      return NextResponse.json(
        { error: "Chain parameter required" },
        { status: 400 },
      );
    }

    // Type guard for chain parameter
    function isValidChain(chain: string): chain is keyof typeof CHAIN_CONFIG {
      return chain in CHAIN_CONFIG;
    }

    if (!isValidChain(chainParam)) {
      return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
    }

    // At this point TypeScript knows chainParam is a valid chain
    const chain = chainParam;
    logger.debug(`Fetching balances for ${chain} address ${address}`);
    // Validate chain is EVM compatible
    if (!isEvmChain(chain)) {
      return NextResponse.json(
        { error: "Invalid chain or non-EVM chain" },
        { status: 400 },
      );
    }

    const chainConfig = CHAIN_CONFIG[chain];
    if (!chainConfig) {
      return NextResponse.json(
        { error: "Chain configuration not found" },
        { status: 400 },
      );
    }

    const simpleHashChain = CHAIN_MAPPING[chain];
    if (!simpleHashChain) {
      return NextResponse.json(
        { error: "Chain not supported by SimpleHash" },
        { status: 400 },
      );
    }

    logger.debug(`Fetching balances for ${chain} address ${address}`);

    const headers = {
      Accept: "application/json",
      "X-API-KEY": SIMPLEHASH_API_KEY,
    };

    // Fetch native token balance with prices
    const nativeRes = await fetch(
      `${SIMPLEHASH_BASE_URL}/native_tokens/balances?chains=${simpleHashChain}&wallet_addresses=${address}&include_prices=1`,
      {
        headers,
        next: { revalidate: 60 },
      },
    );

    if (!nativeRes.ok) {
      throw new Error(`SimpleHash API error: ${nativeRes.status}`);
    }

    const nativeData = await nativeRes.json();
    logger.debug("Raw native token response:", {
      native_tokens: nativeData.native_tokens,
      price_data: nativeData.native_tokens?.[0]?.price_usd_cents,
      total_quantity: nativeData.native_tokens?.[0]?.total_quantity_string,
      chain: simpleHashChain,
      raw_response: nativeData,
    });

    const balances = [];
    const prices: Record<string, { price: number; timestamp: number }> = {};

    // Process native token
    if (nativeData.native_tokens) {
      logger.debug("Processing native tokens for chain:", {
        chain: simpleHashChain,
        token_count: nativeData.native_tokens.length,
        has_tokens: !!nativeData.native_tokens.length,
      });

      for (const token of nativeData.native_tokens) {
        if (token.total_quantity_string) {
          try {
            const rawAmount = token.total_quantity_string;
            const decimals = chainConfig.nativeCurrency.decimals;
            const uiAmount = Number(formatUnits(rawAmount, decimals));

            logger.debug("Processing native token:", {
              chain: simpleHashChain,
              symbol: chainConfig.nativeCurrency.symbol,
              has_price: !!token.total_value_usd_cents,
              price_usd_cents: token.total_value_usd_cents,
              quantity: token.total_quantity_string,
            });

            if (!Number.isFinite(uiAmount)) {
              logger.warn("Invalid token amount", {
                token: chainConfig.nativeCurrency.symbol,
                amount: rawAmount,
                decimals,
              });
              continue;
            }

            if (token.total_value_usd_cents) {
              logger.debug(
                `Native token price data for ${chainConfig.nativeCurrency.symbol}:`,
                {
                  total_value_usd_cents: token.total_value_usd_cents,
                  ui_amount: uiAmount,
                  converted_price:
                    token.total_value_usd_cents / (100 * uiAmount),
                  chain: simpleHashChain,
                  raw_token: token,
                },
              );
              prices[chainConfig.nativeCurrency.symbol] = {
                price: token.total_value_usd_cents / (100 * uiAmount),
                timestamp: Date.now(),
              };
            } else {
              logger.warn(
                `No price data for native token ${chainConfig.nativeCurrency.symbol}`,
              );
            }

            balances.push({
              token: {
                symbol: chainConfig.nativeCurrency.symbol,
                name: chainConfig.nativeCurrency.name,
                decimals: chainConfig.nativeCurrency.decimals,
                chainId: chainConfig.chainId,
                verified: true,
                address: "0x0000000000000000000000000000000000000000",
              },
              balance: rawAmount,
              uiAmount,
            });
          } catch (error) {
            logger.error(
              "Error processing native token balance",
              new Error(error instanceof Error ? error.message : String(error)),
              {
                token: chainConfig.nativeCurrency.symbol,
              },
            );
          }
        }
      }
    }

    // Fetch all fungible tokens with pagination
    let cursor = null;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      pageCount++;
      const url = new URL(`${SIMPLEHASH_BASE_URL}/fungibles/balances`);
      url.searchParams.append("chains", simpleHashChain);
      url.searchParams.append("wallet_addresses", address);
      url.searchParams.append("include_fungible_details", "1");
      url.searchParams.append("include_prices", "1");
      url.searchParams.append("include_dex_info", "1");
      url.searchParams.append("limit", MAX_TOKENS_PER_REQUEST.toString());
      if (cursor) {
        url.searchParams.append("cursor", cursor);
      }

      logger.debug("Fetching fungible tokens", {
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
      logger.debug("Raw fungible token response:", {
        fungibles: fungibleData.fungibles?.map((token: SimpleHashToken) => ({
          symbol: token.symbol,
          price_usd_cents: token.price_usd_cents,
          total_quantity: token.total_quantity_string,
        })),
      });

      // Process fungible tokens
      if (fungibleData.fungibles) {
        for (const token of fungibleData.fungibles) {
          if (token.total_quantity_string) {
            try {
              const rawAmount = token.total_quantity_string;
              const decimals = token.decimals || 18;
              const uiAmount = Number(formatUnits(rawAmount, decimals));

              if (!Number.isFinite(uiAmount)) {
                logger.warn("Invalid token amount", {
                  token: token.symbol,
                  amount: rawAmount,
                  decimals,
                });
                continue;
              }

              if (token.total_value_usd_cents) {
                logger.debug(`Token price data for ${token.symbol}:`, {
                  total_value_usd_cents: token.total_value_usd_cents,
                  ui_amount: uiAmount,
                  converted_price:
                    token.total_value_usd_cents / (100 * uiAmount),
                });
                prices[token.symbol] = {
                  price: token.total_value_usd_cents / (100 * uiAmount),
                  timestamp: Date.now(),
                };
              } else {
                logger.warn(`No price data for token ${token.symbol}`);
              }

              balances.push({
                token: {
                  symbol: token.symbol || "",
                  name: token.name || "",
                  decimals: decimals,
                  chainId: chainConfig.chainId,
                  verified: token.verified || false,
                  address: token.contract_address,
                },
                balance: rawAmount,
                uiAmount,
              });
            } catch (error) {
              logger.error(
                "Error processing fungible token",
                new Error(
                  error instanceof Error ? error.message : String(error),
                ),
                {
                  tokenId: token.fungible_id,
                },
              );
              continue;
            }
          }
        }
      }

      cursor = fungibleData.next;
      hasMore = !!cursor && pageCount < 5;
    }

    logger.debug(`Found ${balances.length} total tokens`);

    // Sort balances by value
    balances.sort((a, b) => {
      const aValue = (prices[a.token.symbol]?.price || 0) * a.uiAmount;
      const bValue = (prices[b.token.symbol]?.price || 0) * b.uiAmount;
      return bValue - aValue;
    });

    logger.debug("Raw price data:", prices);

    // Normalize the price data to ensure correct values
    const normalizedPrices = Object.fromEntries(
      Object.entries(prices).map(([symbol, priceData]) => {
        const typedPriceData = priceData as {
          price: number | string;
          timestamp?: number;
        };
        logger.debug(`Processing price for ${symbol}:`, typedPriceData);
        return [
          symbol,
          {
            price:
              typeof typedPriceData.price === "number"
                ? typedPriceData.price
                : Number(typedPriceData.price) || 0,
            timestamp: typedPriceData.timestamp || Date.now(),
          },
        ];
      }),
    );

    logger.debug("Normalized price data:", normalizedPrices);

    return NextResponse.json({ balances, prices: normalizedPrices });
  } catch (error) {
    logger.error(
      "Error fetching EVM balances:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
