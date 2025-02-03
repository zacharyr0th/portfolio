// Core platform and chain types
export const PLATFORMS = [
    'Fidelity',
    'SoFi',
    'Chase',
    'Betterment',
    'Schwab',
    'Tradovate',
    'Kraken',
    'Coinbase',
    'Gemini',
    'Carta',
    'Magna',
    'TD Auto Finance',
    'Apple',
    'Venmo',
    'Lead Bank',
    'Robinhood',
    'Wells Fargo',
] as const satisfies readonly string[]

export const CHAINS = ['aptos', 'solana', 'sui', 'base'] as const satisfies readonly string[]

export const BROKER_CATEGORIES = [
    'RSU',
    'RTU',
    'Margin',
    'Leverage',
    'Cash',
    'RIRA',
    '401k',
    'HSA',
] as const satisfies readonly string[]

// Core type definitions using template literal types for better type safety
export type PlatformCategory = 'bank' | 'broker' | 'cex'
export type AccountType = 'wallet' | 'cex' | 'broker' | 'bank' | 'credit' | 'debit'
export type AccountStatus = 'active' | 'inactive' | 'standby' | 'not_started'

// Derived types from constants with improved type inference
export type PlatformType = (typeof PLATFORMS)[number]
export type ChainType = (typeof CHAINS)[number]
export type BrokerCategory = (typeof BROKER_CATEGORIES)[number]

// Platform names for each account type with improved type safety
export type BankPlatform = Extract<
    PlatformType,
    'Chase' | 'Wells Fargo' | 'SoFi' | 'Fidelity' | 'Betterment' | 'Lead Bank'
>

export type BrokerPlatform = Extract<
    PlatformType,
    'Robinhood' | 'Fidelity' | 'Schwab' | 'Tradovate' | 'Carta' | 'Magna'
>

export type CexPlatform = Extract<PlatformType, 'Kraken' | 'Gemini' | 'Coinbase'>

export type CreditPlatform = Extract<
    PlatformType,
    'Chase' | 'Wells Fargo' | 'Apple' | 'TD Auto Finance'
>

export type DebitPlatform = Extract<
    PlatformType,
    'Chase' | 'Wells Fargo' | 'SoFi' | 'Fidelity' | 'Venmo'
>

// Card module types with improved type safety
export type CardType = 'Visa' | 'Mastercard'
export type CardCategory = 'credit' | 'debit' | 'hsa'
export type CardIssuer = Extract<
    PlatformType,
    'Chase' | 'Wells Fargo' | 'SoFi' | 'Fidelity' | 'Apple' | 'Venmo' | 'Gemini'
>

// Improved interface with optional fields grouped together
export interface CardDetails {
    readonly cardType: CardType
    readonly accountNumber?: string
    readonly expiryDate?: string
    readonly cvv?: string
    readonly rewards?: string
    readonly priority?: number
}

// Account categories with improved type safety
export type AccountCategory = {
    readonly bank: 'checking' | 'savings' | 'loan'
    readonly broker: BrokerCategory
    readonly wallet: ChainType
}

// Base account interface with improved type safety
export interface BaseAccount {
    readonly id: string
    readonly name: string
    readonly type: AccountType
    readonly platform?: PlatformType
    readonly value: number
    readonly lastUpdated: string
    readonly notes?: string
    readonly isRetirement?: boolean
}

// Specialized account interfaces with improved type safety
export interface BankAccount extends BaseAccount {
    readonly type: 'bank'
    readonly accountNumber?: string
    readonly routingNumber?: string
    readonly category: AccountCategory['bank']
    readonly metadata?: Readonly<{
        purpose?: string
        address?: string
        routingNumber?: string
        accountNumber?: string
    }>
}

export interface BrokerAccount extends BaseAccount {
    readonly type: 'broker'
    readonly category: BrokerCategory
    readonly positions?: ReadonlyArray<{
        readonly symbol: string
        readonly name: string
        readonly quantity: number
        readonly price: number
    }>
    readonly cash?: number
}

export interface CexAccount extends BaseAccount {
    readonly type: 'cex'
    readonly apiKey?: string
}

export interface CreditAccount extends BaseAccount, CardDetails {
    readonly type: 'credit'
    readonly creditLimit: number
    readonly apr: number
    readonly dueDate: number
    readonly autopay: boolean
}

export interface DebitAccount extends BaseAccount, CardDetails {
    readonly type: 'debit'
    readonly plaid?: Readonly<{
        enabled: boolean
        status: 'pending' | 'active' | 'error'
        lastSync: string
    }>
}

export interface WalletAccount extends Omit<BaseAccount, 'platform'> {
    readonly type: 'wallet'
    readonly chain: ChainType
    readonly status: AccountStatus
    readonly publicKey: string
    readonly isColdStorage?: boolean
    readonly metadata?: Readonly<{
        purpose?: string
        wallet?: string
        device?: string
    }>
}

// Union type for all accounts
export type Account =
    | BankAccount
    | BrokerAccount
    | CexAccount
    | WalletAccount
    | CreditAccount
    | DebitAccount

// Portfolio types with improved type safety
export interface PortfolioTotals {
    readonly total: number
    readonly byType: Readonly<Record<AccountType, number>>
    readonly byChain: Readonly<Record<ChainType, number>>
    readonly byPlatform: Readonly<Record<PlatformType, number>>
}

export interface PlatformConfig {
    readonly name: PlatformType
    readonly category: PlatformCategory
    readonly url: string
    readonly apiEndpoint?: string
    readonly supportedChains?: readonly ChainType[]
    readonly features: Readonly<{
        hasApi?: boolean
        requiresAuth?: boolean
        supportsWebhooks?: boolean
    }>
}

export interface PortfolioMetrics extends PortfolioTotals {
    readonly performance: Readonly<{
        daily: number
        weekly: number
        monthly: number
        yearly: number
    }>
    readonly risk: Readonly<{
        volatility: number
        sharpeRatio: number
    }>
    readonly allocation: Readonly<{
        byAssetClass: Record<string, number>
        byRisk: Record<string, number>
    }>
}

export interface PortfolioData {
    readonly accounts: ReadonlyArray<Account>
    readonly totals: PortfolioTotals
    readonly metrics: PortfolioMetrics
    readonly lastUpdated: string
    readonly version: string
    readonly performance: Readonly<{
        currentBalance: Readonly<{
            total: number
            wallets: number
            cex: number
            equities: number
        }>
        allocation: Readonly<{
            wallets: number
            cex: number
            equities: number
        }>
        periodData: Readonly<{
            '1D': ReadonlyArray<{ date: string; value: number }>
            '1W': ReadonlyArray<{ date: string; value: number }>
            '1M': ReadonlyArray<{ date: string; value: number }>
            '3M': ReadonlyArray<{ date: string; value: number }>
            '1Y': ReadonlyArray<{ date: string; value: number }>
            YTD: ReadonlyArray<{ date: string; value: number }>
        }>
    }>
}

// URL record types with improved type safety
export type BankUrls = Readonly<Record<BankPlatform, string>>
export type BrokerUrls = Readonly<Record<BrokerPlatform, string>>
export type CexUrls = Readonly<Record<CexPlatform, string>>
export type CreditUrls = Readonly<Record<CreditPlatform, string>>
export type DebitUrls = Readonly<Record<DebitPlatform, string>>

// Combined platform URLs type with improved type safety
export interface PlatformUrls {
    readonly bank: BankUrls
    readonly broker: BrokerUrls
    readonly cex: CexUrls
    readonly credit: CreditUrls
    readonly debit: DebitUrls
}

// React component prop types with improved type safety
export interface BaseCardProps {
    readonly account: Account
    readonly expanded?: boolean
    readonly onToggle?: () => void
    readonly children?: React.ReactNode
    readonly className?: string
    readonly variant?: 'compact' | 'detailed'
}

export interface SharedCardProps {
    readonly account: Account
    readonly compact?: boolean
    readonly isExpanded?: boolean
    readonly onUpdateValue?: (id: string, value: number) => void
}

// Platform-specific account type helper with improved type safety
export type PlatformAccount<T extends Account, P> = Omit<T, 'platform'> & {
    readonly platform: P
}

// Platform-specific account types with improved type safety
export type BankAccountWithPlatform = PlatformAccount<BankAccount, BankPlatform>
export type BrokerAccountWithPlatform = PlatformAccount<BrokerAccount, BrokerPlatform>
export type CexAccountWithPlatform = PlatformAccount<CexAccount, CexPlatform>
export type CreditAccountWithPlatform = PlatformAccount<CreditAccount, CreditPlatform>
export type DebitAccountWithPlatform = PlatformAccount<DebitAccount, DebitPlatform>

export interface DebitCardProps extends SharedCardProps {
    readonly account: DebitAccount & { platform: DebitPlatform }
}

// Export constants with proper readonly types
export const SUPPORTED_CHAINS: readonly ChainType[] = CHAINS
export const SUPPORTED_PLATFORMS: readonly PlatformType[] = PLATFORMS
