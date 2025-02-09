import type { WalletAccount } from "./cards/types";
import { logger } from "@/lib/utils/core/logger";
import { EVM_CHAINS } from "@/lib/chains/evm/types";

// Helper to create wallet config with improved type safety
const createWalletConfig = (
  id: string,
  name: string,
  chain: ChainType,
  publicKey: string,
  chainId?: number, // Optional chainId for EVM chains
): Readonly<WalletAccount> => ({
  id,
  name,
  type: "wallet" as const,
  chain,
  status: "active" as const,
  publicKey,
  chainId,
  value: 0,
  lastUpdated: new Date().toISOString(),
});

// Supported chain identifiers with type safety
export const SUPPORTED_CHAINS = [
  "aptos",
  "solana",
  "sui",
  "sei",
  "ethereum",
  "polygon",
  "arbitrum",
  "arbitrum_nova",
  "avalanche",
  "base",
  "blast",
  "bsc",
  "canto",
  "celo",
  "fantom",
  "gnosis",
  "linea",
  "manta",
  "mantle",
  "mode",
  "moonbeam",
  "opbnb",
  "optimism",
  "polygon_zkevm",
  "scroll",
  "zksync_era",
  "zora",
] as const satisfies readonly string[];
export type ChainType = (typeof SUPPORTED_CHAINS)[number];

// Function to dynamically generate wallet configurations from environment variables
function generateWalletConfigs(): Record<
  string,
  Record<string, WalletAccount>
> {
  const walletConfigs = {
    solana: {} as Record<string, WalletAccount>,
    aptos: {} as Record<string, WalletAccount>,
    sui: {} as Record<string, WalletAccount>,
    sei: {} as Record<string, WalletAccount>,
    ethereum: {} as Record<string, WalletAccount>,
    polygon: {} as Record<string, WalletAccount>,
    arbitrum: {} as Record<string, WalletAccount>,
    arbitrum_nova: {} as Record<string, WalletAccount>,
    avalanche: {} as Record<string, WalletAccount>,
    base: {} as Record<string, WalletAccount>,
    blast: {} as Record<string, WalletAccount>,
    bsc: {} as Record<string, WalletAccount>,
    canto: {} as Record<string, WalletAccount>,
    celo: {} as Record<string, WalletAccount>,
    fantom: {} as Record<string, WalletAccount>,
    gnosis: {} as Record<string, WalletAccount>,
    linea: {} as Record<string, WalletAccount>,
    manta: {} as Record<string, WalletAccount>,
    mantle: {} as Record<string, WalletAccount>,
    mode: {} as Record<string, WalletAccount>,
    moonbeam: {} as Record<string, WalletAccount>,
    opbnb: {} as Record<string, WalletAccount>,
    optimism: {} as Record<string, WalletAccount>,
    polygon_zkevm: {} as Record<string, WalletAccount>,
    scroll: {} as Record<string, WalletAccount>,
    zksync_era: {} as Record<string, WalletAccount>,
    zora: {} as Record<string, WalletAccount>,
  } as const;

  // Get all environment variables
  const envVars = process.env || {};

  // Debug: Log environment variables related to wallets
  logger.debug("Found wallet environment variables:", {
    solana: Object.keys(envVars).filter((key) =>
      key.startsWith("SOLANA_WALLET"),
    ),
    aptos: Object.keys(envVars).filter((key) => key.startsWith("APTOS_WALLET")),
    sui: Object.keys(envVars).filter((key) => key.startsWith("SUI_WALLET")),
    sei: Object.keys(envVars).filter((key) => key.startsWith("SEI_WALLET")),
    ethereum: Object.keys(envVars).filter((key) =>
      key.startsWith("ETH_WALLET"),
    ),
    polygon: Object.keys(envVars).filter((key) =>
      key.startsWith("POLYGON_WALLET"),
    ),
    arbitrum: Object.keys(envVars).filter((key) =>
      key.startsWith("ARBITRUM_WALLET"),
    ),
    arbitrum_nova: Object.keys(envVars).filter((key) =>
      key.startsWith("ARBITRUM_NOVA_WALLET"),
    ),
    avalanche: Object.keys(envVars).filter((key) =>
      key.startsWith("AVALANCHE_WALLET"),
    ),
    base: Object.keys(envVars).filter((key) => key.startsWith("BASE_WALLET")),
    blast: Object.keys(envVars).filter((key) => key.startsWith("BLAST_WALLET")),
    bsc: Object.keys(envVars).filter((key) => key.startsWith("BSC_WALLET")),
    canto: Object.keys(envVars).filter((key) => key.startsWith("CANTO_WALLET")),
    celo: Object.keys(envVars).filter((key) => key.startsWith("CELO_WALLET")),
    fantom: Object.keys(envVars).filter((key) =>
      key.startsWith("FANTOM_WALLET"),
    ),
    gnosis: Object.keys(envVars).filter((key) =>
      key.startsWith("GNOSIS_WALLET"),
    ),
    linea: Object.keys(envVars).filter((key) => key.startsWith("LINEA_WALLET")),
    manta: Object.keys(envVars).filter((key) => key.startsWith("MANTA_WALLET")),
    mantle: Object.keys(envVars).filter((key) =>
      key.startsWith("MANTLE_WALLET"),
    ),
    mode: Object.keys(envVars).filter((key) => key.startsWith("MODE_WALLET")),
    moonbeam: Object.keys(envVars).filter((key) =>
      key.startsWith("MOONBEAM_WALLET"),
    ),
    opbnb: Object.keys(envVars).filter((key) => key.startsWith("OPBNB_WALLET")),
    optimism: Object.keys(envVars).filter((key) =>
      key.startsWith("OPTIMISM_WALLET"),
    ),
    polygon_zkevm: Object.keys(envVars).filter((key) =>
      key.startsWith("POLYGON_ZKEVM_WALLET"),
    ),
    scroll: Object.keys(envVars).filter((key) =>
      key.startsWith("SCROLL_WALLET"),
    ),
    zksync_era: Object.keys(envVars).filter((key) =>
      key.startsWith("ZKSYNC_ERA_WALLET"),
    ),
    zora: Object.keys(envVars).filter((key) => key.startsWith("ZORA_WALLET")),
  });

  // Process each environment variable for wallets
  Object.entries(envVars).forEach(([key, value]) => {
    if (
      !value ||
      value === "your_solana_wallet_address" ||
      value === "your_aptos_wallet_address" ||
      value === "your_sui_wallet_address" ||
      value === "your_sei_wallet_address" ||
      value === "your_eth_wallet_address" ||
      value === "your_polygon_wallet_address" ||
      value === "your_arbitrum_wallet_address" ||
      value === "your_arbitrum_nova_wallet_address" ||
      value === "your_avalanche_wallet_address" ||
      value === "your_base_wallet_address" ||
      value === "your_blast_wallet_address" ||
      value === "your_bsc_wallet_address" ||
      value === "your_canto_wallet_address" ||
      value === "your_celo_wallet_address" ||
      value === "your_fantom_wallet_address" ||
      value === "your_gnosis_wallet_address" ||
      value === "your_linea_wallet_address" ||
      value === "your_manta_wallet_address" ||
      value === "your_mantle_wallet_address" ||
      value === "your_mode_wallet_address" ||
      value === "your_moonbeam_wallet_address" ||
      value === "your_opbnb_wallet_address" ||
      value === "your_optimism_wallet_address" ||
      value === "your_polygon_zkevm_wallet_address" ||
      value === "your_scroll_wallet_address" ||
      value === "your_zksync_era_wallet_address" ||
      value === "your_zora_wallet_address"
    ) {
      logger.debug(`Skipping placeholder wallet value for ${key}`);
      return;
    }

    // Match wallet public keys by prefix
    const solanaMatch = key.match(/^SOLANA_WALLET_(.+)$/);
    const aptosMatch = key.match(/^APTOS_WALLET_(.+)$/);
    const suiMatch = key.match(/^SUI_WALLET_(.+)$/);
    const seiMatch = key.match(/^SEI_WALLET_(.+)$/);
    const ethMatch = key.match(/^ETH_WALLET_(.+)$/);
    const polygonMatch = key.match(/^POLYGON_WALLET_(.+)$/);
    const arbitrumMatch = key.match(/^ARBITRUM_WALLET_(.+)$/);
    const arbitrumNovaMatch = key.match(/^ARBITRUM_NOVA_WALLET_(.+)$/);
    const avalancheMatch = key.match(/^AVALANCHE_WALLET_(.+)$/);
    const baseMatch = key.match(/^BASE_WALLET_(.+)$/);
    const blastMatch = key.match(/^BLAST_WALLET_(.+)$/);
    const bscMatch = key.match(/^BSC_WALLET_(.+)$/);
    const cantoMatch = key.match(/^CANTO_WALLET_(.+)$/);
    const celoMatch = key.match(/^CELO_WALLET_(.+)$/);
    const fantomMatch = key.match(/^FANTOM_WALLET_(.+)$/);
    const gnosisMatch = key.match(/^GNOSIS_WALLET_(.+)$/);
    const lineaMatch = key.match(/^LINEA_WALLET_(.+)$/);
    const mantaMatch = key.match(/^MANTA_WALLET_(.+)$/);
    const mantleMatch = key.match(/^MANTLE_WALLET_(.+)$/);
    const modeMatch = key.match(/^MODE_WALLET_(.+)$/);
    const moonbeamMatch = key.match(/^MOONBEAM_WALLET_(.+)$/);
    const opbnbMatch = key.match(/^OPBNB_WALLET_(.+)$/);
    const optimismMatch = key.match(/^OPTIMISM_WALLET_(.+)$/);
    const polygonZkevmMatch = key.match(/^POLYGON_ZKEVM_WALLET_(.+)$/);
    const scrollMatch = key.match(/^SCROLL_WALLET_(.+)$/);
    const zksyncEraMatch = key.match(/^ZKSYNC_ERA_WALLET_(.+)$/);
    const zoraMatch = key.match(/^ZORA_WALLET_(.+)$/);

    try {
      if (solanaMatch?.[1]) {
        const name = solanaMatch[1];
        const id = `sol-${name.toLowerCase()}`;
        walletConfigs.solana[id] = createWalletConfig(
          id,
          name,
          "solana",
          value,
        );
        logger.debug(`Created Solana wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (aptosMatch?.[1]) {
        const name = aptosMatch[1];
        const id = `apt-${name.toLowerCase()}`;
        walletConfigs.aptos[id] = createWalletConfig(id, name, "aptos", value);
        logger.debug(`Created Aptos wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (suiMatch?.[1]) {
        const name = suiMatch[1];
        const id = `sui-${name.toLowerCase()}`;
        walletConfigs.sui[id] = createWalletConfig(id, name, "sui", value);
        logger.debug(`Created Sui wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (seiMatch?.[1]) {
        const name = seiMatch[1];
        const id = `sei-${name.toLowerCase()}`;
        walletConfigs.sei[id] = createWalletConfig(id, name, "sei", value);
        logger.debug(`Created SEI wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (ethMatch?.[1]) {
        const name = ethMatch[1];
        const id = `eth-${name.toLowerCase()}`;
        walletConfigs.ethereum[id] = createWalletConfig(
          id,
          name,
          "ethereum",
          value,
          EVM_CHAINS.ethereum.chainId,
        );
        logger.debug(`Created Ethereum wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (polygonMatch?.[1]) {
        const name = polygonMatch[1];
        const id = `poly-${name.toLowerCase()}`;
        walletConfigs.polygon[id] = createWalletConfig(
          id,
          name,
          "polygon",
          value,
          EVM_CHAINS.polygon.chainId,
        );
        logger.debug(`Created Polygon wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (arbitrumMatch?.[1]) {
        const name = arbitrumMatch[1];
        const id = `arb-${name.toLowerCase()}`;
        walletConfigs.arbitrum[id] = createWalletConfig(
          id,
          name,
          "arbitrum",
          value,
          EVM_CHAINS.arbitrum.chainId,
        );
        logger.debug(`Created Arbitrum wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (optimismMatch?.[1]) {
        const name = optimismMatch[1];
        const id = `op-${name.toLowerCase()}`;
        walletConfigs.optimism[id] = createWalletConfig(
          id,
          name,
          "optimism",
          value,
          EVM_CHAINS.optimism.chainId,
        );
        logger.debug(`Created Optimism wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (baseMatch?.[1]) {
        const name = baseMatch[1];
        const id = `base-${name.toLowerCase()}`;
        walletConfigs.base[id] = createWalletConfig(
          id,
          name,
          "base",
          value,
          EVM_CHAINS.base.chainId,
        );
        logger.debug(`Created Base wallet config:`, {
          id,
          name,
          publicKey: value,
        });
      } else if (arbitrumNovaMatch?.[1]) {
        const name = arbitrumNovaMatch[1];
        const id = `arbnova-${name.toLowerCase()}`;
        walletConfigs.arbitrum_nova[id] = createWalletConfig(
          id,
          name,
          "arbitrum_nova",
          value,
          EVM_CHAINS.arbitrum_nova.chainId,
        );
      } else if (avalancheMatch?.[1]) {
        const name = avalancheMatch[1];
        const id = `avax-${name.toLowerCase()}`;
        walletConfigs.avalanche[id] = createWalletConfig(
          id,
          name,
          "avalanche",
          value,
          EVM_CHAINS.avalanche.chainId,
        );
      } else if (blastMatch?.[1]) {
        const name = blastMatch[1];
        const id = `blast-${name.toLowerCase()}`;
        walletConfigs.blast[id] = createWalletConfig(
          id,
          name,
          "blast",
          value,
          EVM_CHAINS.blast.chainId,
        );
      } else if (bscMatch?.[1]) {
        const name = bscMatch[1];
        const id = `bsc-${name.toLowerCase()}`;
        walletConfigs.bsc[id] = createWalletConfig(
          id,
          name,
          "bsc",
          value,
          EVM_CHAINS.bsc.chainId,
        );
      } else if (cantoMatch?.[1]) {
        const name = cantoMatch[1];
        const id = `canto-${name.toLowerCase()}`;
        walletConfigs.canto[id] = createWalletConfig(
          id,
          name,
          "canto",
          value,
          EVM_CHAINS.canto.chainId,
        );
      } else if (celoMatch?.[1]) {
        const name = celoMatch[1];
        const id = `celo-${name.toLowerCase()}`;
        walletConfigs.celo[id] = createWalletConfig(
          id,
          name,
          "celo",
          value,
          EVM_CHAINS.celo.chainId,
        );
      } else if (fantomMatch?.[1]) {
        const name = fantomMatch[1];
        const id = `ftm-${name.toLowerCase()}`;
        walletConfigs.fantom[id] = createWalletConfig(
          id,
          name,
          "fantom",
          value,
          EVM_CHAINS.fantom.chainId,
        );
      } else if (gnosisMatch?.[1]) {
        const name = gnosisMatch[1];
        const id = `gno-${name.toLowerCase()}`;
        walletConfigs.gnosis[id] = createWalletConfig(
          id,
          name,
          "gnosis",
          value,
          EVM_CHAINS.gnosis.chainId,
        );
      } else if (lineaMatch?.[1]) {
        const name = lineaMatch[1];
        const id = `linea-${name.toLowerCase()}`;
        walletConfigs.linea[id] = createWalletConfig(
          id,
          name,
          "linea",
          value,
          EVM_CHAINS.linea.chainId,
        );
      } else if (mantaMatch?.[1]) {
        const name = mantaMatch[1];
        const id = `manta-${name.toLowerCase()}`;
        walletConfigs.manta[id] = createWalletConfig(
          id,
          name,
          "manta",
          value,
          EVM_CHAINS.manta.chainId,
        );
      } else if (mantleMatch?.[1]) {
        const name = mantleMatch[1];
        const id = `mantle-${name.toLowerCase()}`;
        walletConfigs.mantle[id] = createWalletConfig(
          id,
          name,
          "mantle",
          value,
          EVM_CHAINS.mantle.chainId,
        );
      } else if (modeMatch?.[1]) {
        const name = modeMatch[1];
        const id = `mode-${name.toLowerCase()}`;
        walletConfigs.mode[id] = createWalletConfig(
          id,
          name,
          "mode",
          value,
          EVM_CHAINS.mode.chainId,
        );
      } else if (moonbeamMatch?.[1]) {
        const name = moonbeamMatch[1];
        const id = `glmr-${name.toLowerCase()}`;
        walletConfigs.moonbeam[id] = createWalletConfig(
          id,
          name,
          "moonbeam",
          value,
          EVM_CHAINS.moonbeam.chainId,
        );
      } else if (opbnbMatch?.[1]) {
        const name = opbnbMatch[1];
        const id = `opbnb-${name.toLowerCase()}`;
        walletConfigs.opbnb[id] = createWalletConfig(
          id,
          name,
          "opbnb",
          value,
          EVM_CHAINS.opbnb.chainId,
        );
      } else if (polygonZkevmMatch?.[1]) {
        const name = polygonZkevmMatch[1];
        const id = `zkpoly-${name.toLowerCase()}`;
        walletConfigs.polygon_zkevm[id] = createWalletConfig(
          id,
          name,
          "polygon_zkevm",
          value,
          EVM_CHAINS.polygon_zkevm.chainId,
        );
      } else if (scrollMatch?.[1]) {
        const name = scrollMatch[1];
        const id = `scroll-${name.toLowerCase()}`;
        walletConfigs.scroll[id] = createWalletConfig(
          id,
          name,
          "scroll",
          value,
          EVM_CHAINS.scroll.chainId,
        );
      } else if (zksyncEraMatch?.[1]) {
        const name = zksyncEraMatch[1];
        const id = `zksync-${name.toLowerCase()}`;
        walletConfigs.zksync_era[id] = createWalletConfig(
          id,
          name,
          "zksync_era",
          value,
          EVM_CHAINS.zksync_era.chainId,
        );
      } else if (zoraMatch?.[1]) {
        const name = zoraMatch[1];
        const id = `zora-${name.toLowerCase()}`;
        walletConfigs.zora[id] = createWalletConfig(
          id,
          name,
          "zora",
          value,
          EVM_CHAINS.zora.chainId,
        );
      }
    } catch (error) {
      logger.error(
        `Error creating wallet config for ${key}:`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  });

  // Debug: Log final configurations
  logger.debug("Generated wallet configurations:", {
    solanaCount: Object.keys(walletConfigs.solana).length,
    aptosCount: Object.keys(walletConfigs.aptos).length,
    suiCount: Object.keys(walletConfigs.sui).length,
    seiCount: Object.keys(walletConfigs.sei).length,
    ethereumCount: Object.keys(walletConfigs.ethereum).length,
    polygonCount: Object.keys(walletConfigs.polygon).length,
    arbitrumCount: Object.keys(walletConfigs.arbitrum).length,
    arbitrumNovaCount: Object.keys(walletConfigs.arbitrum_nova).length,
    avalancheCount: Object.keys(walletConfigs.avalanche).length,
    baseCount: Object.keys(walletConfigs.base).length,
    blastCount: Object.keys(walletConfigs.blast).length,
    bscCount: Object.keys(walletConfigs.bsc).length,
    cantoCount: Object.keys(walletConfigs.canto).length,
    celoCount: Object.keys(walletConfigs.celo).length,
    fantomCount: Object.keys(walletConfigs.fantom).length,
    gnosisCount: Object.keys(walletConfigs.gnosis).length,
    lineaCount: Object.keys(walletConfigs.linea).length,
    mantaCount: Object.keys(walletConfigs.manta).length,
    mantleCount: Object.keys(walletConfigs.mantle).length,
    modeCount: Object.keys(walletConfigs.mode).length,
    moonbeamCount: Object.keys(walletConfigs.moonbeam).length,
    opbnbCount: Object.keys(walletConfigs.opbnb).length,
    optimismCount: Object.keys(walletConfigs.optimism).length,
    polygonZkevmCount: Object.keys(walletConfigs.polygon_zkevm).length,
    scrollCount: Object.keys(walletConfigs.scroll).length,
    zksyncEraCount: Object.keys(walletConfigs.zksync_era).length,
    zoraCount: Object.keys(walletConfigs.zora).length,
    configs: walletConfigs,
  });

  return walletConfigs;
}

// Main account configuration with improved type safety
export const accountConfig = {
  wallets: generateWalletConfigs(),
  banks: {},
  brokers: {},
  cex: {
    kraken: {
      id: "kraken-main",
      platform: "Kraken" as const,
      type: "cex" as const,
      name: "Kraken",
      value: 0,
      lastUpdated: new Date().toISOString(),
    },
    gemini: {
      id: "gemini-main",
      platform: "Gemini" as const,
      type: "cex" as const,
      name: "Gemini",
      value: 0,
      lastUpdated: new Date().toISOString(),
    },
  },
  credit: {},
  debit: {},
} as const;

// Export individual account sections
export const {
  wallets,
  banks,
  brokers,
  cex,
  credit: creditAccounts,
  debit: debitAccounts,
} = accountConfig;

// Function to fetch wallet configurations
export async function getWalletConfigs(): Promise<
  Record<string, Record<string, WalletAccount>>
> {
  try {
    const response = await fetch("/api/accounts");
    if (!response.ok) {
      throw new Error("Failed to fetch wallet configurations");
    }
    return response.json();
  } catch (error) {
    logger.error("Failed to fetch wallet configurations:", error as Error);
    return generateWalletConfigs(); // Fallback to environment-based config
  }
}
