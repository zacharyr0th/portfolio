import type {
    TokenBalance as AptosTokenBalance,
    TokenPrice as AptosTokenPrice,
} from './aptos/types'
import type {
    TokenBalance as SolanaTokenBalance,
    TokenPrice as SolanaTokenPrice,
} from './solana/types'
import type { TokenBalance as SuiTokenBalance, TokenPrice as SuiTokenPrice } from './sui/types'
import type { ComponentType } from 'react'

// Union types for cross-chain compatibility
export type ChainTokenBalance = AptosTokenBalance | SolanaTokenBalance | SuiTokenBalance
export type ChainTokenPrice = AptosTokenPrice | SolanaTokenPrice | SuiTokenPrice

// Supported chains
export const CHAINS = ['aptos', 'solana', 'sui'] as const
export type ChainType = (typeof CHAINS)[number]

// Props for balance display components
export interface BalanceDisplayProps {
    balance: ChainTokenBalance
    prices: Record<string, ChainTokenPrice>
    showPrice?: boolean
    showChange?: boolean
}

// Interface for chain-specific handlers
export interface ChainHandler {
    fetchBalances: (publicKey: string) => Promise<{ balances: ChainTokenBalance[] }>
    fetchPrices: () => Promise<Record<string, ChainTokenPrice>>
    getExplorerUrl: (publicKey: string, accountId: string) => string
    BalanceDisplay: ComponentType<BalanceDisplayProps>
    clearCache: () => void
}
