import { TOKEN_SYMBOL_MAP } from '@/lib/chains/aptos/constants'
import type {
    Account,
    AccountType,
    ChainType,
    WalletAccount,
} from '@/app/components/accounts/cards/types'
import { getStaptValue } from '@/lib/chains/aptos/utils'
import type { ChartDataItemWithTrend, TrendData } from './types'

interface CoinResource {
    type: string
    data: {
        coin: {
            value: string
        }
    }
}

export type AccountWithResources = (Account | WalletAccount) & {
    resources?: CoinResource[]
    value?: number
    chain?: ChainType
    type?: AccountType
    asset?: string
    historicalValues?: {
        timestamp: number
        value: number
    }[]
}

export interface ChartDataItem {
    name: string
    value: number
    percentage: number
}

export interface ChartData {
    portfolio: ChartDataItemWithTrend[]
    chains: ChartDataItemWithTrend[]
    platforms: ChartDataItemWithTrend[]
    assets: ChartDataItemWithTrend[]
}

// Cache for STAPT token type to avoid repeated lookups
const STAPT_TOKEN_TYPE = Object.keys(TOKEN_SYMBOL_MAP).find(
    k => TOKEN_SYMBOL_MAP[k]?.symbol === 'STAPT'
)
const STAPT_DECIMALS = (STAPT_TOKEN_TYPE && TOKEN_SYMBOL_MAP[STAPT_TOKEN_TYPE]?.decimals) || 0

const calculateTrend = (historicalValues: { timestamp: number; value: number }[] = []): TrendData | undefined => {
    if (historicalValues.length < 2) return undefined

    // Sort by timestamp in ascending order
    const sortedValues = [...historicalValues].sort((a, b) => a.timestamp - b.timestamp)
    if (sortedValues.length < 2) return undefined

    const latest = sortedValues[sortedValues.length - 1]
    const previous = sortedValues[0]

    if (!latest || !previous) return undefined

    const latestValue = latest.value
    const previousValue = previous.value

    if (latestValue === undefined || previousValue === undefined) return undefined
    
    // Calculate percentage change
    const change = ((latestValue - previousValue) / previousValue) * 100
    
    // Determine period
    const firstValue = sortedValues[0]
    const lastValue = sortedValues[sortedValues.length - 1]

    if (!firstValue?.timestamp || !lastValue?.timestamp) return undefined

    const startDate = new Date(firstValue.timestamp)
    const endDate = new Date(lastValue.timestamp)
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    let period = '24h'
    if (daysDiff >= 30) period = '30d'
    else if (daysDiff >= 7) period = '7d'
    
    return { change, period }
}

const formatData = (
    data: Record<string, { value: number; historicalValues?: { timestamp: number; value: number }[] }>,
    includeAllCategories?: boolean,
    categories?: readonly string[]
): ChartDataItemWithTrend[] => {
    const total = Object.values(data).reduce((a, b) => a + b.value, 0)

    let entries = Object.entries(data)

    // If this is portfolio data, include all categories even if they're zero
    if (includeAllCategories && categories) {
        const existingKeys = new Set(entries.map(([key]) => key))
        categories.forEach(category => {
            if (!existingKeys.has(category)) {
                entries.push([category, { value: 0 }])
            }
        })
    } else {
        // For non-portfolio data, filter out zero values
        entries = entries.filter(([_, { value }]) => value > 0)
    }

    return entries
        .map(([name, { value, historicalValues }]) => ({
            name,
            value,
            percentage: total > 0 ? (value / total) * 100 : 0,
            trend: calculateTrend(historicalValues),
        }))
        .sort((a, b) => b.value - a.value)
}

// Generic function to calculate distribution by a key
const calculateDistribution = <T extends string>(
    accounts: AccountWithResources[],
    getKey: (account: AccountWithResources) => T | undefined
): Record<T, { value: number; historicalValues?: { timestamp: number; value: number }[] }> => {
    return accounts.reduce(
        (acc, account) => {
            const key = getKey(account)
            if (key) {
                let value = account.value || 0
                const historicalValues = account.historicalValues || []

                // Add chain-specific values
                if (key === 'aptos' || account.chain === 'aptos') {
                    value += getStaptValue(account.resources)
                }

                if (!acc[key]) {
                    acc[key] = { value: 0, historicalValues: [] }
                }
                acc[key].value += value
                acc[key].historicalValues = [...(acc[key].historicalValues || []), ...historicalValues]
            }
            return acc
        },
        {} as Record<T, { value: number; historicalValues?: { timestamp: number; value: number }[] }>
    )
}

const calculateTotalsByType = (accounts: AccountWithResources[]): Record<AccountType, { value: number; historicalValues?: { timestamp: number; value: number }[] }> =>
    calculateDistribution(accounts, account => account.type)

// Move maps to constants at the top of the file
const CHAIN_MAP: Record<string, string> = {
    aptos: 'Aptos',
    solana: 'Solana',
    sui: 'Sui',
}

const PLATFORM_MAP: Record<string, string> = {
    kraken: 'Kraken',
    gemini: 'Gemini',
}

// Update the chain distribution function
const calculateChainDistribution = (
    accounts: AccountWithResources[]
): Record<ChainType, { value: number; historicalValues?: { timestamp: number; value: number }[] }> => {
    const distribution = calculateDistribution(accounts, account => {
        if (!account.chain) return undefined
        return CHAIN_MAP[account.chain.toLowerCase()]
    })
    return distribution
}

// Update the platform distribution function
const calculatePlatformDistribution = (
    accounts: AccountWithResources[]
): Record<string, { value: number; historicalValues?: { timestamp: number; value: number }[] }> => {
    return calculateDistribution(accounts, account => {
        if (account.type === 'wallet') {
            return CHAIN_MAP[account.chain?.toLowerCase() ?? '']
        }
        return PLATFORM_MAP[account.platform?.toLowerCase() ?? ''] || account.platform
    })
}

const calculateAssetDistribution = (accounts: AccountWithResources[]): Record<string, { value: number; historicalValues?: { timestamp: number; value: number }[] }> => {
    const distribution: Record<string, { value: number; historicalValues?: { timestamp: number; value: number }[] }> = {}

    accounts.forEach(account => {
        // Skip accounts with no value
        if (!account.value && !account.resources) return

        // Handle CEX and wallet accounts with resources
        if ((account.type === 'cex' || account.type === 'wallet') && Array.isArray(account.resources)) {
            account.resources.forEach(resource => {
                // Validate resource data
                if (!resource || typeof resource !== 'object') return
                if (!resource.type || !resource.data || typeof resource.data !== 'object') return
                
                const coinData = resource.data.coin
                if (!coinData || typeof coinData !== 'object' || !('value' in coinData)) return
                
                // Extract symbol from resource type and ensure it exists
                const symbol = resource.type.split('::').pop()
                if (!symbol) return
                
                const value = parseFloat(String(coinData.value))
                if (!isFinite(value) || value <= 0) return
                
                // Initialize or update distribution entry
                const upperSymbol = symbol.toUpperCase()
                if (!distribution[upperSymbol]) {
                    distribution[upperSymbol] = { value: 0, historicalValues: [] }
                }
                const entry = distribution[upperSymbol]
                if (!entry) return // TypeScript guard
                
                entry.value += value

                // Add historical values if available
                const historicalValues = account.historicalValues
                if (Array.isArray(historicalValues) && historicalValues.length > 0) {
                    const validHistoricalValues = historicalValues.filter(v => 
                        v && typeof v === 'object' && 
                        'value' in v && 
                        'timestamp' in v &&
                        isFinite(v.value) && 
                        v.value >= 0
                    )
                    if (validHistoricalValues.length > 0) {
                        entry.historicalValues = [
                            ...(entry.historicalValues || []),
                            ...validHistoricalValues
                        ]
                    }
                }
            })

            // Handle STAPT assets for Aptos wallets
            if (account.chain === 'aptos') {
                const staptValue = getStaptValue(account.resources)
                if (staptValue > 0) {
                    if (!distribution['STAPT']) {
                        distribution['STAPT'] = { value: 0, historicalValues: [] }
                    }
                    const staptEntry = distribution['STAPT']
                    if (!staptEntry) return // TypeScript guard
                    
                    staptEntry.value += staptValue
                    
                    const historicalValues = account.historicalValues
                    if (Array.isArray(historicalValues) && historicalValues.length > 0) {
                        const validHistoricalValues = historicalValues.filter(v => 
                            v && typeof v === 'object' && 
                            'value' in v && 
                            'timestamp' in v &&
                            isFinite(v.value) && 
                            v.value >= 0
                        )
                        if (validHistoricalValues.length > 0) {
                            staptEntry.historicalValues = [
                                ...(staptEntry.historicalValues || []),
                                ...validHistoricalValues
                            ]
                        }
                    }
                }
            }
        }
        
        // Handle broker accounts with single asset type
        else if (account.type === 'broker' && account.asset && account.value) {
            const symbol = account.asset.toString().toUpperCase()
            const value = account.value
            
            if (!isFinite(value) || value <= 0) return
            
            if (!distribution[symbol]) {
                distribution[symbol] = { value: 0, historicalValues: [] }
            }
            const entry = distribution[symbol]
            if (!entry) return // TypeScript guard
            
            entry.value += value
            
            const historicalValues = account.historicalValues
            if (Array.isArray(historicalValues) && historicalValues.length > 0) {
                const validHistoricalValues = historicalValues.filter(v => 
                    v && typeof v === 'object' && 
                    'value' in v && 
                    'timestamp' in v &&
                    isFinite(v.value) && 
                    v.value >= 0
                )
                if (validHistoricalValues.length > 0) {
                    entry.historicalValues = [
                        ...(entry.historicalValues || []),
                        ...validHistoricalValues
                    ]
                }
            }
        }
    })

    // Filter out dust amounts and normalize historical values
    return Object.entries(distribution).reduce((acc, [symbol, data]) => {
        // Only include assets worth more than 1 cent
        if (data.value > 0.01) {
            // Normalize historical values if they exist
            const historicalValues = data.historicalValues
            if (Array.isArray(historicalValues) && historicalValues.length > 0) {
                const sortedValues = [...historicalValues].sort((a, b) => a.timestamp - b.timestamp)
                data.historicalValues = sortedValues.filter((v, i) => {
                    if (i === 0) return true
                    const prev = sortedValues[i - 1]
                    return prev && v.timestamp !== prev.timestamp
                })
            }
            acc[symbol] = data
        }
        return acc
    }, {} as Record<string, { value: number; historicalValues?: { timestamp: number; value: number }[] }>)
}

export const processPortfolioData = (
    accounts: AccountWithResources[],
    portfolioCategories?: readonly string[]
): ChartData => {
    const totals = calculateTotalsByType(accounts)

    const portfolio = {
        Wallets: totals.wallet || { value: 0 },
        CEX: totals.cex || { value: 0 },
        Brokers: totals.broker || { value: 0 },
        Banks: totals.bank || { value: 0 },
    } as const

    const chains = calculateChainDistribution(accounts)
    const platforms = calculatePlatformDistribution(accounts)
    const assets = calculateAssetDistribution(accounts)

    return {
        portfolio: formatData(portfolio, true, portfolioCategories),
        chains: formatData(chains),
        platforms: formatData(platforms),
        assets: formatData(assets),
    }
}
