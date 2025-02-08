import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/core/logger";
import crypto from "crypto";
import { SUPPORTED_CHAINS, type ChainType } from "@/lib/chains/constants";

interface WalletConfig {
  id: string;
  name: string;
  type: "wallet";
  chain: ChainType;
  status: "active";
  publicKey: string;
  value: number;
  lastUpdated: string;
}

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper to create wallet config
const createWalletConfig = (
  id: string,
  name: string,
  chain: ChainType,
  publicKey: string,
): WalletConfig => ({
  id,
  name,
  type: "wallet" as const,
  chain,
  status: "active" as const,
  publicKey,
  value: 0,
  lastUpdated: new Date().toISOString(),
});

// Chain to environment variable prefix mapping
const CHAIN_ENV_PREFIX: Record<ChainType, string> = {
  ethereum: "ETH",
  solana: "SOLANA",
  bitcoin: "BTC",
  utxo: "UTXO",
  tezos: "TEZOS",
  aptos: "APTOS",
  flow: "FLOW",
  flow_evm: "FLOW_EVM",
  sei: "SEI",
  sui: "SUI",
  abstract: "ABSTRACT",
  apechain: "APECHAIN",
  polygon: "POLYGON",
  arbitrum: "ARBITRUM",
  arbitrum_nova: "ARBITRUM_NOVA",
  avalanche: "AVAX",
  b3: "B3",
  base: "BASE",
  blast: "BLAST",
  bsc: "BSC",
  canto: "CANTO",
  celo: "CELO",
  cyber: "CYBER",
  degen: "DEGEN",
  fantom: "FTM",
  forma: "FORMA",
  gnosis: "GNOSIS",
  godwoken: "GODWOKEN",
  immutable_zkevm: "IMX",
  linea: "LINEA",
  loot: "LOOT",
  manta: "MANTA",
  mantle: "MANTLE",
  mode: "MODE",
  moonbeam: "MOONBEAM",
  opbnb: "OPBNB",
  optimism: "OPTIMISM",
  palm: "PALM",
  polygon_zkevm: "POLYGON_ZKEVM",
  proof_of_play: "PLAY",
  proof_of_play_boss: "PLAY_BOSS",
  rari: "RARI",
  soneium: "SONEIUM",
  saakuru: "SAAKURU",
  scroll: "SCROLL",
  shape: "SHAPE",
  treasure: "TREASURE",
  xai: "XAI",
  zksync_era: "ZKSYNC",
  zora: "ZORA",
};

// Function to dynamically generate wallet configurations from environment variables
function generateWalletConfigs(): Record<
  ChainType,
  Record<string, WalletConfig>
> {
  const walletConfigs = Object.fromEntries(
    Object.keys(SUPPORTED_CHAINS).map((chain) => [
      chain,
      {} as Record<string, WalletConfig>,
    ]),
  ) as Record<ChainType, Record<string, WalletConfig>>;

  // Get all environment variables
  const envVars = process.env as Record<string, string>;

  // Debug log all environment variables
  logger.debug("All environment variables:", {
    all: Object.keys(envVars),
    wallet: Object.keys(envVars).filter((key) => key.includes("WALLET")),
    // Log each chain's wallet variables
    ...Object.fromEntries(
      Object.entries(CHAIN_ENV_PREFIX).map(([chain, prefix]) => [
        chain,
        Object.keys(envVars).filter((key) =>
          key.startsWith(`${prefix}_WALLET`),
        ),
      ]),
    ),
  });

  // Process each environment variable for wallets
  Object.entries(envVars).forEach(([key, value]) => {
    logger.debug(`Processing env var: ${key}=${value}`);

    if (!value || value.includes("your_") || value === "undefined") {
      logger.debug(`Skipping placeholder wallet value for ${key}`);
      return;
    }

    // Check each chain's wallet pattern
    for (const [chain, prefix] of Object.entries(CHAIN_ENV_PREFIX)) {
      const pattern = `^${prefix}_WALLET_(.+)$`;
      const match = key.match(new RegExp(pattern));
      if (match?.[1]) {
        const name = match[1];
        const id = `${chain}-${name.toLowerCase()}`;
        try {
          walletConfigs[chain as ChainType][id] = createWalletConfig(
            id,
            name,
            chain as ChainType,
            value,
          );
          logger.debug(`Created ${chain} wallet config:`, {
            id,
            name,
            publicKey: value,
          });
        } catch (error) {
          logger.error(
            `Error creating wallet config for ${key}:`,
            error instanceof Error ? error : new Error(String(error)),
          );
        }
        break;
      }
    }
  });

  return walletConfigs;
}

// Get account configurations
export async function GET(): Promise<NextResponse> {
  const requestId = crypto.randomBytes(32).toString("base64");

  try {
    // Generate wallet configurations dynamically
    const walletConfigs = generateWalletConfigs();

    // Log the generated configurations for debugging
    logger.debug("Generated wallet configurations:", {
      requestId,
      walletCount: Object.fromEntries(
        Object.entries(walletConfigs).map(([chain, configs]) => [
          chain,
          Object.keys(configs).length,
        ]),
      ),
      // Log public keys for each chain
      ...Object.fromEntries(
        Object.entries(walletConfigs).map(([chain, configs]) => [
          `${chain}Wallets`,
          Object.values(configs).map((w) => w.publicKey),
        ]),
      ),
    });

    // Return the configurations
    return NextResponse.json(walletConfigs, {
      status: 200,
      headers: new Headers({
        ...corsHeaders,
        "X-Request-ID": requestId,
      }),
    });
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Unknown error occurred");
    logger.error("Error fetching account configurations", err, { requestId });

    return NextResponse.json(
      { error: err.message },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "X-Request-ID": requestId,
        },
      },
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: new Headers(corsHeaders),
    },
  );
}
