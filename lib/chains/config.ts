import type { ChainType } from "./types";
import { logger } from "@/lib/utils/core/logger";

// Environment variable validation with fallback
const getEnvVar = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value && !fallback) {
    logger.warn(
      `Environment variable ${key} not found, using default RPC endpoint`,
    );
  }
  logger.debug(
    `Loading environment variable ${key}: ${value || fallback || "(not set)"}`,
  );
  return value || fallback || "";
};

// Chain info interface with strict typing and immutability
export interface ChainInfo {
  readonly name: string;
  readonly symbol: string;
  readonly explorer: string;
  readonly nativeToken: string;
  readonly decimals: number;
  readonly isTestnet: boolean;
  readonly rpcEndpoint: string;
  readonly features: {
    readonly hasSmartContracts: boolean;
    readonly hasNFTs: boolean;
    readonly hasDeFi: boolean;
  };
}

// Chain info with strict typing, readonly properties, and validation
export const chainInfo: Readonly<Record<ChainType, ChainInfo>> = Object.freeze({
  aptos: {
    name: "Aptos",
    symbol: "APT",
    explorer: "https://explorer.aptoslabs.com",
    nativeToken: "APT",
    decimals: 8,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "APTOS_RPC_URL",
      "https://fullnode.mainnet.aptoslabs.com/v1",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  solana: {
    name: "Solana",
    symbol: "SOL",
    explorer: "https://solscan.io",
    nativeToken: "SOL",
    decimals: 9,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "SOLANA_RPC_URL",
      "https://api.mainnet-beta.solana.com",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  sui: {
    name: "Sui",
    symbol: "SUI",
    explorer: "https://suiscan.com",
    nativeToken: "SUI",
    decimals: 9,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "SUI_RPC_URL",
      "https://fullnode.mainnet.sui.io:443",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  ethereum: {
    name: "Ethereum",
    symbol: "ETH",
    explorer: "https://etherscan.io",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "NEXT_PUBLIC_ETH_RPC_URL",
      "https://eth.llamarpc.com",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  polygon: {
    name: "Polygon",
    symbol: "MATIC",
    explorer: "https://polygonscan.com",
    nativeToken: "MATIC",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "NEXT_PUBLIC_POLYGON_RPC_URL",
      "https://polygon.llamarpc.com",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  arbitrum: {
    name: "Arbitrum One",
    symbol: "ETH",
    explorer: "https://arbiscan.io",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("ARBITRUM_RPC_URL", "https://arb1.arbitrum.io/rpc"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  optimism: {
    name: "Optimism",
    symbol: "ETH",
    explorer: "https://optimistic.etherscan.io",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "NEXT_PUBLIC_OPTIMISM_RPC_URL",
      "https://mainnet.optimism.io",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  base: {
    name: "Base",
    symbol: "ETH",
    explorer: "https://basescan.org",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "NEXT_PUBLIC_BASE_RPC_URL",
      "https://mainnet.base.org",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  tezos: {
    name: "Tezos",
    symbol: "XTZ",
    explorer: "https://tzstats.com",
    nativeToken: "XTZ",
    decimals: 6,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "TEZOS_RPC_URL",
      "https://mainnet.tezos.marigold.dev",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  flow: {
    name: "Flow",
    symbol: "FLOW",
    explorer: "https://flowdiver.io",
    nativeToken: "FLOW",
    decimals: 8,
    isTestnet: false,
    rpcEndpoint: getEnvVar("FLOW_RPC_URL", "https://rest-mainnet.onflow.org"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  flow_evm: {
    name: "Flow EVM",
    symbol: "FLOW",
    explorer: "https://flowdiver.io/evm",
    nativeToken: "FLOW",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("FLOW_EVM_RPC_URL", "https://mainnet.evm.flow.com"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  sei: {
    name: "Sei",
    symbol: "SEI",
    explorer: "https://www.seiscan.app",
    nativeToken: "SEI",
    decimals: 6,
    isTestnet: false,
    rpcEndpoint: getEnvVar("SEI_RPC_URL", "https://sei-rpc.ankr.com"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  arbitrum_nova: {
    name: "Arbitrum Nova",
    symbol: "ETH",
    explorer: "https://nova.arbiscan.io",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "ARBITRUM_NOVA_RPC_URL",
      "https://nova.arbitrum.io/rpc",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  avalanche: {
    name: "Avalanche",
    symbol: "AVAX",
    explorer: "https://snowtrace.io",
    nativeToken: "AVAX",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "AVALANCHE_RPC_URL",
      "https://api.avax.network/ext/bc/C/rpc",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  canto: {
    name: "Canto",
    symbol: "CANTO",
    explorer: "https://cantoscan.com",
    nativeToken: "CANTO",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("CANTO_RPC_URL", "https://canto.slingshot.finance"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  fantom: {
    name: "Fantom",
    symbol: "FTM",
    explorer: "https://ftmscan.com",
    nativeToken: "FTM",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("FANTOM_RPC_URL", "https://rpc.ftm.tools"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  blast: {
    name: "Blast",
    symbol: "ETH",
    explorer: "https://blastscan.io",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("BLAST_RPC_URL", "https://rpc.blast.io"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  bsc: {
    name: "BSC",
    symbol: "BNB",
    explorer: "https://bscscan.com",
    nativeToken: "BNB",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("BSC_RPC_URL", "https://bsc-dataseed1.binance.org"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  moonbeam: {
    name: "Moonbeam",
    symbol: "GLMR",
    explorer: "https://moonbeam.moonscan.io",
    nativeToken: "GLMR",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "MOONBEAM_RPC_URL",
      "https://rpc.api.moonbeam.network",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  abstract: {
    name: "Abstract",
    symbol: "ABS",
    explorer: "https://abstract.explorers.guru",
    nativeToken: "ABS",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("ABSTRACT_RPC_URL", "https://rpc.abstract.systems"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  apechain: {
    name: "ApeChain",
    symbol: "APE",
    explorer: "https://apechain.explorers.guru",
    nativeToken: "APE",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("APECHAIN_RPC_URL", "https://rpc.apechain.com"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  b3: {
    name: "B3",
    symbol: "B3",
    explorer: "https://b3.explorers.guru",
    nativeToken: "B3",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("B3_RPC_URL", "https://rpc.b3.network"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  forma: {
    name: "Forma",
    symbol: "FORMA",
    explorer: "https://forma.explorers.guru",
    nativeToken: "FORMA",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("FORMA_RPC_URL", "https://rpc.forma.network"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  proof_of_play: {
    name: "Proof of Play",
    symbol: "POP",
    explorer: "https://proofofplay.explorers.guru",
    nativeToken: "POP",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "PROOF_OF_PLAY_RPC_URL",
      "https://rpc.proofofplay.games",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  treasure: {
    name: "Treasure",
    symbol: "MAGIC",
    explorer: "https://explorer.treasure.lol",
    nativeToken: "MAGIC",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "TREASURE_RPC_URL",
      "https://arbitrum-nova.publicnode.com",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  xai: {
    name: "Xai",
    symbol: "XAI",
    explorer: "https://explorer.xai.games",
    nativeToken: "XAI",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("XAI_RPC_URL", "https://xai-chain.net/rpc"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  zksync_era: {
    name: "zkSync Era",
    symbol: "ETH",
    explorer: "https://explorer.zksync.io",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "ZKSYNC_ERA_RPC_URL",
      "https://mainnet.era.zksync.io",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  mantle: {
    name: "Mantle",
    symbol: "MNT",
    explorer: "https://explorer.mantle.xyz",
    nativeToken: "MNT",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("MANTLE_RPC_URL", "https://rpc.mantle.xyz"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  scroll: {
    name: "Scroll",
    symbol: "ETH",
    explorer: "https://scrollscan.com",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("SCROLL_RPC_URL", "https://rpc.scroll.io"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  zora: {
    name: "Zora",
    symbol: "ETH",
    explorer: "https://explorer.zora.energy",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("ZORA_RPC_URL", "https://rpc.zora.energy"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  gnosis: {
    name: "Gnosis",
    symbol: "xDAI",
    explorer: "https://gnosisscan.io",
    nativeToken: "xDAI",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("GNOSIS_RPC_URL", "https://rpc.gnosischain.com"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  proof_of_play_boss: {
    name: "Proof of Play Boss",
    symbol: "BOSS",
    explorer: "https://proofofplayboss.explorers.guru",
    nativeToken: "BOSS",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "PROOF_OF_PLAY_BOSS_RPC_URL",
      "https://rpc.proofofplay.games/boss",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  rari: {
    name: "Rari",
    symbol: "RARI",
    explorer: "https://rari.explorers.guru",
    nativeToken: "RARI",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("RARI_RPC_URL", "https://rpc.rari.capital"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  soneium: {
    name: "Soneium",
    symbol: "SONE",
    explorer: "https://soneium.explorers.guru",
    nativeToken: "SONE",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("SONEIUM_RPC_URL", "https://rpc.soneium.com"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  saakuru: {
    name: "Saakuru",
    symbol: "SAAK",
    explorer: "https://explorer.saakuru.network",
    nativeToken: "SAAK",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("SAAKURU_RPC_URL", "https://rpc.saakuru.network"),
    features: {
      hasSmartContracts: true,
      hasNFTs: false,
      hasDeFi: true,
    },
  },
  shape: {
    name: "Shape",
    symbol: "SHAPE",
    explorer: "https://explorer.shape.network",
    nativeToken: "SHAPE",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("SHAPE_RPC_URL", "https://mainnet.shape.network"),
    features: {
      hasSmartContracts: true,
      hasNFTs: false,
      hasDeFi: true,
    },
  },
  palm: {
    name: "Palm",
    symbol: "PALM",
    explorer: "https://explorer.palm.io",
    nativeToken: "PALM",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "PALM_RPC_URL",
      "https://palm-mainnet.infura.io/v3/3a961d6501e54add9a41aa53f15de99b",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: false,
      hasDeFi: true,
    },
  },
  cyber: {
    name: "Cyber",
    symbol: "CYBER",
    explorer: "https://explorer.cyber.co",
    nativeToken: "CYBER",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("CYBER_RPC_URL", "https://rpc.cyber.co"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  polygon_zkevm: {
    name: "Polygon zkEVM",
    symbol: "ETH",
    explorer: "https://zkevm.polygonscan.com",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("POLYGON_ZKEVM_RPC_URL", "https://zkevm-rpc.com"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  godwoken: {
    name: "Godwoken",
    symbol: "CKB",
    explorer: "https://v1.gwscan.com",
    nativeToken: "CKB",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "GODWOKEN_RPC_URL",
      "https://v1.mainnet.godwoken.io/rpc",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  immutable_zkevm: {
    name: "Immutable zkEVM",
    symbol: "IMX",
    explorer: "https://explorer.immutable.com",
    nativeToken: "IMX",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "IMMUTABLE_ZKEVM_RPC_URL",
      "https://rpc.immutable.com",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  linea: {
    name: "Linea",
    symbol: "ETH",
    explorer: "https://lineascan.build",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("LINEA_RPC_URL", "https://rpc.linea.build"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  loot: {
    name: "Loot",
    symbol: "LOOT",
    explorer: "https://explorer.lootchain.com",
    nativeToken: "LOOT",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("LOOT_RPC_URL", "https://rpc.lootchain.com"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  manta: {
    name: "Manta",
    symbol: "ETH",
    explorer: "https://pacific-explorer.manta.network",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "MANTA_RPC_URL",
      "https://pacific-rpc.manta.network/http",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  mode: {
    name: "Mode",
    symbol: "ETH",
    explorer: "https://explorer.mode.network",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("MODE_RPC_URL", "https://mainnet.mode.network"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  opbnb: {
    name: "opBNB",
    symbol: "BNB",
    explorer: "https://opbnbscan.com",
    nativeToken: "BNB",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "OPBNB_RPC_URL",
      "https://opbnb-mainnet-rpc.bnbchain.org",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: false,
    },
  },
  bitcoin: {
    name: "Bitcoin",
    symbol: "BTC",
    explorer: "https://mempool.space",
    nativeToken: "BTC",
    decimals: 8,
    isTestnet: false,
    rpcEndpoint: getEnvVar("BITCOIN_RPC_URL", "https://mempool.space/api"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  celo: {
    name: "Celo",
    symbol: "CELO",
    explorer: "https://explorer.celo.org",
    nativeToken: "CELO",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar("CELO_RPC_URL", "https://forno.celo.org"),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
  arbitrum_one: {
    name: "Arbitrum One",
    symbol: "ETH",
    explorer: "https://arbiscan.io",
    nativeToken: "ETH",
    decimals: 18,
    isTestnet: false,
    rpcEndpoint: getEnvVar(
      "ARBITRUM_ONE_RPC_URL",
      "https://arb1.arbitrum.io/rpc",
    ),
    features: {
      hasSmartContracts: true,
      hasNFTs: true,
      hasDeFi: true,
    },
  },
});

// Cached chain info getter
const chainInfoCache = new Map<ChainType, ChainInfo>();

export const getChainInfo = (chain: ChainType): ChainInfo => {
  if (!chainInfoCache.has(chain)) {
    const info = chainInfo[chain];
    if (!info) {
      throw new Error(`Chain info not found for ${chain}`);
    }
    chainInfoCache.set(chain, info);
  }
  return chainInfoCache.get(chain)!;
};

export const getChainExplorerUrl = (
  chain: ChainType,
  address: string,
): string => {
  const info = getChainInfo(chain);
  return `${info.explorer}/account/${address}`;
};

// Type guard for chain validation
export const isValidChain = (chain: string): chain is ChainType => {
  return chain in chainInfo;
};

// Get default chain from environment
export const getDefaultChain = (): ChainType => {
  const defaultChain = process.env.DEFAULT_CHAIN;
  if (!defaultChain || !isValidChain(defaultChain)) {
    return "aptos"; // Fallback to Aptos if not specified or invalid
  }
  return defaultChain;
};
