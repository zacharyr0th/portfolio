import type { ComponentType } from 'react'

// Base token interface
interface BaseToken {
    symbol: string
    name: string
    decimals: number
    chainId?: number
    verified?: boolean
    logoURI?: string
}

// Chain-specific token types
export interface AptosToken extends BaseToken {
    tokenAddress: string
}

export interface SolanaToken extends BaseToken {
    address: string
    chainId: 101 // Solana mainnet
}

export interface SuiToken extends BaseToken {
    tokenAddress: string
}

export interface EvmToken extends BaseToken {
    address: string
    chainId: number
}

// Union type for all token types
export type ChainToken = AptosToken | SolanaToken | SuiToken | EvmToken

// Balance interfaces
export interface TokenBalance {
    token: ChainToken
    balance: string
    uiAmount: number
}

export type ChainTokenBalance = TokenBalance

// Price interfaces
export interface TokenPrice {
    price: number
    priceChange24h: number
    lastUpdated?: number
}

export type ChainTokenPrice = TokenPrice

// Supported chains
export const CHAINS = [
    'aptos', 
    'solana', 
    'sui',
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'base'
] as const
export type ChainType = (typeof CHAINS)[number]

// Props for balance display components
export interface BalanceDisplayProps {
    balance: ChainTokenBalance
    prices: Record<string, ChainTokenPrice>
    showPrice?: boolean
    compact?: boolean
    onHide?: () => void
    canHide?: boolean
    isHidden?: boolean
    showHiddenTokens?: boolean
    className?: string
}

// Interface for chain-specific handlers
export interface ChainHandler {
    fetchBalances: (publicKey: string, accountId: string) => Promise<{ balances: ChainTokenBalance[] }>
    fetchPrices: () => Promise<Record<string, ChainTokenPrice>>
    getExplorerUrl: (publicKey: string, accountId: string) => string
    BalanceDisplay: ComponentType<BalanceDisplayProps>
    clearCache: () => void
}
