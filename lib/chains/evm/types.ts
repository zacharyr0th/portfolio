import { BigNumber } from 'ethers'

export interface EvmTokenBalance {
    mint: string;          // Token contract address
    symbol: string;        // Token symbol
    name: string;          // Token name
    decimals: number;      // Token decimals
    balance: BigNumber;    // Raw balance as BigNumber
    uiBalance: number;     // Formatted balance
    logoURI?: string;      // Optional token logo
    chainId: number;       // EVM chain ID
}

export interface EvmTokenPrice {
    price: number;
    priceChange24h: number;
    chainId: number;       // EVM chain ID
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
export const EVM_CHAINS: Record<string, EvmChainConfig> = {
    ethereum: {
        chainId: 1,
        name: 'Ethereum',
        rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL || 'https://rpc.ankr.com/eth',
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    'eth-main': {
        chainId: 1,
        name: 'Ethereum',
        rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL || 'https://eth.drpc.org',
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    polygon: {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com',
        nativeCurrency: {
            name: 'Polygon',
            symbol: 'MATIC',
            decimals: 18
        }
    },
    'polygon-main': {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com',
        nativeCurrency: {
            name: 'Polygon',
            symbol: 'MATIC',
            decimals: 18
        }
    },
    arbitrum: {
        chainId: 42161,
        name: 'Arbitrum One',
        rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    optimism: {
        chainId: 10,
        name: 'Optimism',
        rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        explorerUrl: 'https://optimistic.etherscan.io',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    base: {
        chainId: 8453,
        name: 'Base',
        rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    }
} 