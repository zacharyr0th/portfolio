import { memo, useEffect, useState, useCallback, useMemo } from 'react'
import type { CexAccountWithPlatform } from '../types'
import type { SharedCardProps } from '../types'
import { BaseCard } from '../BaseCard'
import { TokenBalance } from '../TokenBalance'
import { exchangeHandlers, type SupportedExchange } from '@/lib/cex'
import { logger } from '@/lib/utils/core/logger'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

// Constants
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MIN_REFRESH_INTERVAL = 60000 // 1 minute

interface CexCardProps extends SharedCardProps {
    account: CexAccountWithPlatform
    onToggleExpand?: () => void
    showHiddenTokens?: boolean
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
    showHiddenTokens = false,
}: CexCardProps) {
    const [balances, setBalances] = useState<TokenBalanceData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(isExpanded)
    const [lastFetchTime, setLastFetchTime] = useState(0)
    
    // Add hidden tokens state
    const [hiddenTokens, setHiddenTokens] = useLocalStorage<Record<string, string[]>>(
        'hidden-tokens',
        {}
    )

    const toggleHideToken = useCallback((symbol: string) => {
        setHiddenTokens((prev: Record<string, string[]>) => {
            const accountHidden = prev[account.id] || []
            const isHidden = accountHidden.includes(symbol)
            
            if (isHidden) {
                // Remove from hidden list
                return {
                    ...prev,
                    [account.id]: accountHidden.filter((s: string) => s !== symbol)
                }
            } else {
                // Add to hidden list
                return {
                    ...prev,
                    [account.id]: [...accountHidden, symbol]
                }
            }
        })
    }, [account.id, setHiddenTokens])

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
            setError(`Unsupported exchange: ${account.platform}`)
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
            setIsLoading(false)
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

            // Create a map to deduplicate tokens by symbol
            const tokenMap = new Map<string, TokenBalanceData>()

            balancesResult.balances.forEach(balance => {
                const symbol = balance.token.symbol
                const price = prices[symbol]?.price || 0
                const balanceNum = parseFloat(balance.balance)
                const usdValue = balanceNum * price

                const existingBalance = tokenMap.get(symbol)
                if (!existingBalance) {
                    tokenMap.set(symbol, {
                        token: balance.token,
                        balance: balance.balance,
                        usdValue,
                    })
                    return
                }

                // If we already have this token, sum the balances
                const newBalance = (parseFloat(existingBalance.balance) + balanceNum).toString()
                const totalUsdValue = parseFloat(newBalance) * price
                tokenMap.set(symbol, {
                    token: balance.token,
                    balance: newBalance,
                    usdValue: totalUsdValue,
                })
            })

            const processedBalances = Array.from(tokenMap.values())
                .filter(b => {
                    const balanceNum = parseFloat(b.balance)
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
            setError(null)
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

    const filteredBalances = useMemo(() => {
        const accountHidden = hiddenTokens[account.id] || []
        return balances
            .filter(balance => {
                // Show all tokens if showHiddenTokens is true
                if (showHiddenTokens) return true
                
                // Otherwise filter out hidden tokens
                return !accountHidden.includes(balance.token.symbol)
            })
            .sort((a, b) => b.usdValue - a.usdValue)
    }, [balances, hiddenTokens, account.id, showHiddenTokens])

    // Calculate total value based on filtered balances
    const totalValue = useMemo(() => {
        return filteredBalances.reduce((sum, balance) => sum + balance.usdValue, 0)
    }, [filteredBalances])

    useEffect(() => {
        if (onUpdateValue) {
            onUpdateValue(account.id, totalValue)
        }
    }, [account.id, totalValue, onUpdateValue])

    const shouldUseCompactTokens = filteredBalances.length > 5

    return (
        <BaseCard
            account={{
                ...account,
                value: totalValue,
            }}
            expanded={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            variant={compact ? 'compact' : 'detailed'}
            isLoading={isLoading}
            error={error}
            lastUpdated={lastFetchTime}
        >
            {!compact && isOpen && !isLoading && !error && (
                <div className="flex flex-col gap-1">
                    {filteredBalances.map(balance => {
                        const quantity = parseFloat(balance.balance)
                        const price = balance.usdValue / quantity
                        const accountHidden = hiddenTokens[account.id] || []
                        const isHidden = accountHidden.includes(balance.token.symbol)
                        return (
                            <TokenBalance
                                key={`${account.id}-${balance.token.symbol}`}
                                token={balance.token}
                                quantity={quantity}
                                price={price}
                                showPrice
                                compact={shouldUseCompactTokens}
                                canHide={true}
                                onHide={() => toggleHideToken(balance.token.symbol)}
                                isHidden={isHidden}
                                showHiddenTokens={showHiddenTokens}
                            />
                        )
                    })}
                </div>
            )}
        </BaseCard>
    )
}

export const CexCard = memo(CexCardComponent)
