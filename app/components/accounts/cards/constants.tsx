import React from 'react'
import { cn } from '@/lib/utils'
import type { ChainType } from '@/app/components/accounts/cards/types'
import type {
    PlatformUrls,
    BankPlatform,
    BrokerPlatform,
    CexPlatform,
    CreditPlatform,
    DebitPlatform,
    WalletAccount,
    CreditAccount,
    DebitAccount,
} from './types'
import { logger } from '@/lib/utils/core/logger'
import { creditAccounts, debitAccounts } from '../config'

// UI Components
interface LastUpdatedProps {
    readonly date: string | Date
    readonly className?: string
}

export const LastUpdated = React.memo(function LastUpdated({ date, className }: LastUpdatedProps) {
    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            <span className="font-medium min-w-[4.5rem]">Updated:</span>
            <span className="text-[10px] sm:text-xs">{formatLastUpdated(date)}</span>
        </div>
    )
})

LastUpdated.displayName = 'LastUpdated'

// Account type styles for consistent theming across components
export const ACCOUNT_TYPE_STYLES = {
    wallet: {
        bgColor: 'bg-muted/5',
        accentColor: 'border-muted/10 hover:border-muted/20',
        badgeClass: 'bg-muted/20 text-muted-foreground',
        label: 'Wallet',
    },
    cex: {
        bgColor: 'bg-accent/5',
        accentColor: 'border-accent/10 hover:border-accent/20',
        badgeClass: 'bg-accent/20 text-accent',
        label: 'Exchange',
    },
    broker: {
        bgColor: 'bg-primary/5',
        accentColor: 'border-primary/10 hover:border-primary/20',
        badgeClass: 'bg-primary/20 text-primary',
        label: 'Broker',
    },
    bank: {
        bgColor: 'bg-success/5',
        accentColor: 'border-success/10 hover:border-success/20',
        badgeClass: 'bg-success/20 text-success',
        label: 'Bank',
    },
    credit: {
        bgColor: 'bg-destructive/5',
        accentColor: 'border-destructive/10 hover:border-destructive/20',
        badgeClass: 'bg-destructive/20 text-destructive',
        label: 'Credit',
    },
    debit: {
        bgColor: 'bg-warning/5',
        accentColor: 'border-warning/10 hover:border-warning/20',
        badgeClass: 'bg-warning/20 text-warning',
        label: 'Debit',
    },
} as const

// Category descriptions for broker accounts
export const CATEGORY_DESCRIPTIONS = {
    Margin: 'Margin Trading Account',
    Cash: 'Cash Trading Account',
    RIRA: 'Roth IRA',
    '401k': '401(k) Retirement',
    HSA: 'Health Savings Account',
    RSU: 'Restricted Stock Units',
    RTU: 'Restricted Token Units',
    Leverage: 'Leverage Trading Account',
} as const

// Icon configurations with improved type safety
export const CHAIN_ICONS: Readonly<Record<ChainType, { src: string; opacity?: number }>> = {
    aptos: { src: '/icons/account-icons/aptos.webp' },
    solana: { src: '/icons/account-icons/solana.webp', opacity: 50 },
    sui: { src: '/icons/account-icons/sui.webp', opacity: 50 },
    base: { src: '/icons/account-icons/base.webp', opacity: 50 },
} as const

export const PLATFORM_ICONS: Readonly<Record<string, { src: string; opacity?: number }>> = {
    // CEX Platforms
    Kraken: { src: '/icons/account-icons/kraken.webp', opacity: 90 },
    Gemini: { src: '/icons/account-icons/gemini.webp', opacity: 90 },
    Coinbase: { src: '/icons/account-icons/coinbase.webp', opacity: 90 },

    // Broker Platforms
    Fidelity: { src: '/icons/account-icons/placeholder.webp', opacity: 90 },
    Schwab: { src: '/icons/account-icons/schwab.webp', opacity: 90 },
    Robinhood: { src: '/icons/account-icons/robinhood.webp', opacity: 90 },
    'E*TRADE': { src: '/icons/account-icons/etrade.webp', opacity: 90 },
    Tradovate: { src: '/icons/account-icons/tradovate.webp', opacity: 90 },
    Carta: { src: '/icons/account-icons/carta.webp', opacity: 90 },
    Magna: { src: '/icons/account-icons/magna.webp', opacity: 90 },

    // Bank & Payment Platforms
    Chase: { src: '/icons/account-icons/chase.webp', opacity: 90 },
    SoFi: { src: '/icons/account-icons/sofi.webp', opacity: 90 },
    Betterment: { src: '/icons/account-icons/placeholder.webp', opacity: 90 },
    'TD Auto Finance': { src: '/icons/account-icons/td-auto-finance.webp', opacity: 90 },
    Apple: { src: '/icons/account-icons/placeholder.webp', opacity: 90 },
} as const

export const TOKEN_ICONS: Readonly<Record<string, { src: string; opacity?: number }>> = {
    USDC: { src: '/icons/usdc.webp' },
    USDT: { src: '/icons/usdt.webp' },
    SOL: { src: '/icons/solana.webp' },
    APT: { src: '/icons/aptos.webp' },
    SUI: { src: '/icons/sui.webp' },
    ETH: { src: '/icons/eth.webp' },
} as const

// Platform URLs for each account type with improved type safety
export const PLATFORM_URLS: Readonly<PlatformUrls> = {
    bank: {
        Chase: 'https://www.chase.com',
        SoFi: 'https://www.sofi.com',
        Fidelity: 'https://www.fidelity.com',
        Betterment: 'https://www.betterment.com',
        'Wells Fargo': 'https://www.wellsfargo.com',
        'Lead Bank': 'https://www.lead.bank',
    },
    broker: {
        Fidelity: 'https://www.fidelity.com',
        Schwab: 'https://www.schwab.com',
        Robinhood: 'https://robinhood.com',
        Tradovate: 'https://www.tradovate.com',
        Carta: 'https://carta.com',
        Magna: 'https://magna.com',
    },
    cex: {
        Kraken: 'https://www.kraken.com',
        Gemini: 'https://www.gemini.com',
        Coinbase: 'https://www.coinbase.com',
    },
    credit: {
        Chase: 'https://www.chase.com',
        Apple: 'https://card.apple.com',
        'TD Auto Finance': 'https://www.tdautofinance.com',
        'Wells Fargo': 'https://www.wellsfargo.com',
    },
    debit: {
        Chase: 'https://www.chase.com',
        SoFi: 'https://www.sofi.com',
        Fidelity: 'https://www.fidelity.com',
        'Wells Fargo': 'https://www.wellsfargo.com',
        Venmo: 'https://venmo.com',
    },
} as const

// Helper functions for UI components with memoization
export const getChainIcon = (chain: ChainType) => CHAIN_ICONS[chain]
export const getPlatformIcon = (
    platform: BankPlatform | BrokerPlatform | CexPlatform | CreditPlatform | DebitPlatform
) => PLATFORM_ICONS[platform]
export const getTokenIcon = (symbol: string) => TOKEN_ICONS[symbol]
export const formatLastUpdated = (date: string | Date) => new Date(date).toLocaleString()

// Wallet account utility functions
export const formatAddress = (address: string, chain: ChainType): string => {
    if (!address) return ''

    // For Aptos addresses, ensure 0x prefix and proper length
    if (chain === 'aptos') {
        let cleanAddress = address.trim().toLowerCase()
        cleanAddress = cleanAddress.startsWith('0x') ? cleanAddress : `0x${cleanAddress}`
        // Ensure the address is 66 characters (0x + 64 hex chars)
        if (cleanAddress.length !== 66) {
            logger.warn(`Invalid Aptos address length: ${cleanAddress}`)
        }
        return cleanAddress
    }

    // For Solana addresses, return as is since they're base58 encoded
    return chain === 'solana' ? address : address
}

// Helper to distribute chain balance among active wallets
export const distributeChainBalance = (
    wallets: WalletAccount[],
    chain: ChainType
): WalletAccount[] => {
    // Only return wallets that match the specified chain and are active
    return wallets.filter(w => w.chain === chain && w.status === 'active')
}

// Helper functions for prioritized accounts
export const getPrioritizedDebitAccounts = (): Pick<DebitAccount, 'id' | 'name' | 'priority'>[] => {
    return Object.values(debitAccounts as Record<string, DebitAccount>)
        .sort((a, b) => ((a.priority || 99) - (b.priority || 99)))
        .map(account => ({
            id: account.id,
            name: account.name,
            priority: account.priority,
        }))
}

export const getPrioritizedCreditAccounts = (): Pick<
    CreditAccount,
    'id' | 'name' | 'priority' | 'rewards'
>[] => {
    return Object.values(creditAccounts as Record<string, CreditAccount>)
        .sort((a, b) => ((a.priority || 99) - (b.priority || 99)))
        .map(account => ({
            id: account.id,
            name: account.name,
            priority: account.priority,
            rewards: account.rewards,
        }))
}

// Credit metrics with memoization
const memoizedMetrics = new Map<string, number>()

export const getCreditMetrics = (): {
    totalCreditLimit: number
    totalBalance: number
    averageAPR: number
    utilizationRate: number
} => {
    const accounts = Object.values(creditAccounts as Record<string, CreditAccount>)
    if (accounts.length === 0) {
        return {
            totalCreditLimit: 0,
            totalBalance: 0,
            averageAPR: 0,
            utilizationRate: 0,
        }
    }

    const metrics = {
        totalCreditLimit: accounts.reduce((sum, account) => sum + account.creditLimit, 0),
        totalBalance: accounts.reduce((sum, account) => sum + Math.abs(account.value), 0),
        averageAPR: accounts.reduce((sum, account) => sum + account.apr, 0) / accounts.length,
    }

    return {
        ...metrics,
        utilizationRate: metrics.totalBalance / metrics.totalCreditLimit,
    }
}
