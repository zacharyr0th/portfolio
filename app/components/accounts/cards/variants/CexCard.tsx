import { memo, useEffect, useState, useCallback, useMemo } from 'react'
import type { CexAccountWithPlatform } from '../types'
import type { SharedCardProps } from '../types'
import { BaseCard } from '../BaseCard'
import { TokenBalance } from '../TokenBalance'
import { exchangeHandlers, type SupportedExchange } from '@/lib/cex'
import { logger } from '@/lib/utils/core/logger'

// Constants
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MIN_REFRESH_INTERVAL = 60000 // 1 minute

interface CexCardProps extends SharedCardProps {
    account: CexAccountWithPlatform
    onToggleExpand?: () => void
}

interface TokenBalanceData {
    token: {
        symbol: string
        name: string
        decimals: number
    }
    balance: string
    usdValue: number
}

// Cache for balance data
const balanceCache = new Map<string, { data: TokenBalanceData[]; timestamp: number }>()

function CexCardComponent({
    account,
    compact = false,
    isExpanded = false,
    onUpdateValue,
}: CexCardProps) {
    const [balances, setBalances] = useState<TokenBalanceData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(isExpanded)
    const [lastFetchTime, setLastFetchTime] = useState(0)

    useEffect(() => {
        setIsOpen(isExpanded)
    }, [isExpanded])

    const handler = useMemo(() => {
        const platformLower = account.platform.toLowerCase() as SupportedExchange
        if (!['kraken', 'gemini'].includes(platformLower)) return null
        return exchangeHandlers[platformLower]
    }, [account.platform])

    const fetchBalances = useCallback(async () => {
        if (!handler) {
            logger.warn(`Handler not found for ${account.platform}`)
            return
        }

        const now = Date.now()
        const timeSinceLastFetch = now - lastFetchTime
        if (timeSinceLastFetch < MIN_REFRESH_INTERVAL) {
            logger.debug(`Skipping fetch for ${account.id}, too soon`)
            return
        }

        // Check cache
        const cached = balanceCache.get(account.id)
        if (cached && now - cached.timestamp < MIN_REFRESH_INTERVAL) {
            setBalances(cached.data)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

            const [balancesResult, prices] = await Promise.all([
                handler.fetchBalances(),
                handler.fetchPrices(),
            ])

            clearTimeout(timeoutId)

            const processedBalances = balancesResult.balances
                .map(balance => {
                    const price = prices[balance.token.symbol]?.price || 0
                    const balanceNum = parseFloat(balance.balance)
                    const usdValue = balanceNum * price

                    return {
                        token: balance.token,
                        balance: balance.balance,
                        usdValue,
                    }
                })
                // Only filter out dust amounts and zero balances
                .filter(b => {
                    const balanceNum = parseFloat(b.balance)
                    // Keep if: non-zero balance AND (value >= $0.01 OR major token)
                    return (
                        balanceNum > 0 &&
                        (b.usdValue >= 0.01 ||
                            ['BTC', 'ETH', 'SOL', 'APT', 'SUI', 'USDC', 'USDT'].includes(
                                b.token.symbol
                            ))
                    )
                })
                .sort((a, b) => b.usdValue - a.usdValue)

            // Update cache
            balanceCache.set(account.id, { data: processedBalances, timestamp: now })

            const total = processedBalances.reduce((sum, b) => sum + b.usdValue, 0)
            setBalances(processedBalances)
            onUpdateValue?.(account.id, total)
            setLastFetchTime(now)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balances'
            logger.error(`Error fetching balances for ${account.id}: ${errorMessage}`)
            setError(errorMessage)
            onUpdateValue?.(account.id, 0)
        } finally {
            setIsLoading(false)
        }
    }, [handler, account.id, account.platform, onUpdateValue, lastFetchTime])

    useEffect(() => {
        fetchBalances()
        const intervalId = setInterval(fetchBalances, REFRESH_INTERVAL)
        return () => clearInterval(intervalId)
    }, [fetchBalances])

    return (
        <BaseCard
            account={account}
            expanded={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            className={isOpen ? 'h-auto' : undefined}
            variant="detailed"
        >
            {!compact && isOpen && (
                <div className="flex flex-col gap-2.5 pt-1">
                    {isLoading && (
                        <div className="text-sm text-muted-foreground animate-pulse">
                            Loading balances...
                        </div>
                    )}
                    {error && <div className="text-sm text-destructive">{error}</div>}
                    {!isLoading && !error && (
                        <div className="overflow-x-auto">
                            <div className="flex flex-col gap-1">
                                {balances.map(balance => {
                                    const quantity = parseFloat(balance.balance)
                                    const price = balance.usdValue / quantity
                                    return (
                                        <TokenBalance
                                            key={balance.token.symbol}
                                            token={balance.token}
                                            quantity={Number(quantity.toFixed(3))}
                                            price={Number(price.toFixed(3))}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </BaseCard>
    )
}

export const CexCard = memo(CexCardComponent)
