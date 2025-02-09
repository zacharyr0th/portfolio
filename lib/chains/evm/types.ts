import type { BigNumber } from "@ethersproject/bignumber";

export interface EvmToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  isNative?: boolean;
}

export interface EvmTokenBalance {
  token: EvmToken;
  balance: string;
  uiAmount: number;
  usdValue?: number;
}

export interface EvmTokenPrice {
  price: number;
  priceChange24h: number;
}

export interface EvmChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Supported EVM chains
export const EVM_CHAINS = {
  ethereum: {
    chainId: 1,
    name: "Ethereum",
    rpcUrl:
      process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://eth.rpc.rivet.cloud",
    explorerUrl: "https://etherscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrl:
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: {
      name: "Polygon",
      symbol: "MATIC",
      decimals: 18,
    },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl:
      process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
      "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  optimism: {
    chainId: 10,
    name: "Optimism",
    rpcUrl:
      process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  avalanche: {
    chainId: 43114,
    name: "Avalanche",
    rpcUrl:
      process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL ||
      "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
    },
  },
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl:
      process.env.NEXT_PUBLIC_BSC_RPC_URL ||
      "https://bsc-dataseed1.binance.org",
    explorerUrl: "https://bscscan.com",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
  },
  zora: {
    chainId: 7777777,
    name: "Zora",
    rpcUrl: process.env.NEXT_PUBLIC_ZORA_RPC_URL || "https://rpc.zora.energy",
    explorerUrl: "https://explorer.zora.energy",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  blast: {
    chainId: 81457,
    name: "Blast",
    rpcUrl: process.env.NEXT_PUBLIC_BLAST_RPC_URL || "https://rpc.blast.io",
    explorerUrl: "https://blastscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
} as const satisfies Record<string, EvmChainConfig>;

// Helper to get chain by ID
export function getChainById(chainId: number): EvmChainConfig | undefined {
  return Object.values(EVM_CHAINS).find((chain) => chain.chainId === chainId);
}

// Helper to check if address is native token
export function isNativeToken(address: string): boolean {
  return address === "0x0000000000000000000000000000000000000000";
}
