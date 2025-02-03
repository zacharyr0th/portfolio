import type { ChainType } from './types'
import { logger } from '@/lib/utils/core/logger'

// Environment variable validation with fallback
const getEnvVar = (key: string, fallback?: string): string => {
    const value = process.env[key]
    if (!value && !fallback) {
        logger.warn(`Environment variable ${key} not found, using default RPC endpoint`)
    }
    logger.debug(`Loading environment variable ${key}: ${value || fallback || '(not set)'}`)
    return value || fallback || ''
}

// Chain info interface with strict typing and immutability
export interface ChainInfo {
    readonly name: string
    readonly symbol: string
    readonly explorer: string
    readonly nativeToken: string
    readonly decimals: number
    readonly isTestnet: boolean
    readonly rpcEndpoint: string
    readonly features: {
        readonly hasSmartContracts: boolean
        readonly hasNFTs: boolean
        readonly hasDeFi: boolean
    }
}

// Chain info with strict typing, readonly properties, and validation
export const chainInfo: Readonly<Record<ChainType, ChainInfo>> = Object.freeze({
    aptos: {
        name: 'Aptos',
        symbol: 'APT',
        explorer: 'https://explorer.aptoslabs.com',
        nativeToken: 'APT',
        decimals: 8,
        isTestnet: false,
        rpcEndpoint: getEnvVar(
            'APTOS_RPC_URL',
            'https://fullnode.mainnet.aptoslabs.com/v1'
        ),
        features: {
            hasSmartContracts: true,
            hasNFTs: true,
            hasDeFi: true,
        },
    },
    solana: {
        name: 'Solana',
        symbol: 'SOL',
        explorer: 'https://solscan.io',
        nativeToken: 'SOL',
        decimals: 9,
        isTestnet: false,
        rpcEndpoint: getEnvVar('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com'),
        features: {
            hasSmartContracts: true,
            hasNFTs: true,
            hasDeFi: true,
        },
    },
    sui: {
        name: 'Sui',
        symbol: 'SUI',
        explorer: 'https://suiscan.com',
        nativeToken: 'SUI',
        decimals: 9,
        isTestnet: false,
        rpcEndpoint: getEnvVar('SUI_RPC_URL', 'https://fullnode.mainnet.sui.io:443'),
        features: {
            hasSmartContracts: true,
            hasNFTs: true,
            hasDeFi: true,
        },
    },
    base: {
        name: 'Base',
        symbol: 'ETH',
        explorer: 'https://basescan.org',
        nativeToken: 'ETH',
        decimals: 18,
        isTestnet: false,
        rpcEndpoint: getEnvVar('BASE_RPC_URL', 'https://mainnet.base.org'),
        features: {
            hasSmartContracts: true,
            hasNFTs: true,
            hasDeFi: true,
        },
    },
})

// Cached chain info getter
const chainInfoCache = new Map<ChainType, ChainInfo>()

export const getChainInfo = (chain: ChainType): ChainInfo => {
    if (!chainInfoCache.has(chain)) {
        const info = chainInfo[chain]
        if (!info) {
            throw new Error(`Chain info not found for ${chain}`)
        }
        chainInfoCache.set(chain, info)
    }
    return chainInfoCache.get(chain)!
}

export const getChainExplorerUrl = (chain: ChainType, address: string): string => {
    const info = getChainInfo(chain)
    return `${info.explorer}/account/${address}`
}

// Type guard for chain validation
export const isValidChain = (chain: string): chain is ChainType => {
    return chain in chainInfo
}

// Get default chain from environment
export const getDefaultChain = (): ChainType => {
    const defaultChain = process.env.DEFAULT_CHAIN
    if (!defaultChain || !isValidChain(defaultChain)) {
        return 'aptos' // Fallback to Aptos if not specified or invalid
    }
    return defaultChain
}
