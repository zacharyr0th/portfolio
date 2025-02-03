import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react'
import { BaseCard } from '../BaseCard'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { TokenBalance } from '../TokenBalance'
import {
    chainHandlers,
    isValidChain,
    getChainInfo,
    type ChainTokenBalance,
    type ChainTokenPrice,
    type ChainType,
} from '@/lib/chains'
import type { WalletAccount } from '../types'
import { logger } from '@/lib/utils/core/logger'

// Constants
const COPY_TIMEOUT_MS = 2000
const MAX_RETRIES = 3
const RETRY_DELAY = 1000
const REQUEST_TIMEOUT = 15000
const MIN_REFRESH_INTERVAL = 60000
const MAX_REFRESH_INTERVAL = 300000
const CACHE_DURATION = 300000

// Cache for wallet data
const walletCache = new Map<
    string,
    {
        balances: ChainTokenBalance[]
        prices: Record<string, ChainTokenPrice>
        timestamp: number
        error?: string
    }
>()

// Debounced fetch function to prevent multiple simultaneous requests
const debouncedFetches = new Map<string, NodeJS.Timeout>()

interface WalletCardProps {
    account: Omit<WalletAccount, 'chain'> & { chain: ChainType }
    compact?: boolean
    isExpanded?: boolean
    onUpdateValue?: (id: string, value: number) => void
}

function WalletCardComponent({
    account,
    compact = false,
    isExpanded = false,
    onUpdateValue,
}: WalletCardProps) {
    const [copied, setCopied] = useState(false)
    const [isOpen, setIsOpen] = useState(isExpanded)
    const [tokenData, setTokenData] = useState<{
        balances: ChainTokenBalance[]
        prices: Record<string, ChainTokenPrice>
    }>({ balances: [], prices: {} })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [lastFetchTime, setLastFetchTime] = useState(0)
    const abortControllerRef = useRef<AbortController>()

    useEffect(() => {
        setIsOpen(isExpanded)
    }, [isExpanded])

    const chainHandler = useMemo(() => {
        logger.debug(`Initializing chain handler for ${account.chain} wallet: ${account.id}`)
        if (!account.chain || !isValidChain(account.chain)) {
            logger.warn(`Invalid chain ${account.chain} for wallet: ${account.id}`)
            return null
        }
        const handler = chainHandlers[account.chain]
        if (!handler) {
            logger.error(`Handler not found for chain ${account.chain} (wallet: ${account.id})`)
            return null
        }
        return handler
    }, [account.chain, account.id])

    const fetchData = useCallback(
        async (shouldRetry = true) => {
            if (!account.chain || !account.publicKey || !chainHandler) {
                logger.warn(`Invalid account configuration for wallet: ${account.id}`)
                setError('Invalid account configuration')
                return
            }

            const now = Date.now()
            
            // Enhanced cache check with shorter duration for empty balances
            const cached = walletCache.get(account.id)
            if (cached) {
                const cacheAge = now - cached.timestamp
                const hasBalances = cached.balances.length > 0
                const hasPrices = Object.keys(cached.prices).length > 0
                // Use shorter cache duration if no balances or prices found
                const effectiveMinRefresh = (hasBalances && hasPrices) ? 
                    MIN_REFRESH_INTERVAL : 
                    MIN_REFRESH_INTERVAL / 2
                if (cacheAge < effectiveMinRefresh) {
                    setTokenData({ balances: cached.balances, prices: cached.prices })
                    setError(cached.error || null)
                    setIsLoading(false)
                    return
                }
            }

            // Debounce check
            const existingTimeout = debouncedFetches.get(account.id)
            if (existingTimeout) {
                clearTimeout(existingTimeout)
            }

            // Set new debounced fetch
            const timeoutId = setTimeout(async () => {
                setIsLoading(true)
                setError(null)

                try {
                    // Cancel any existing requests
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort()
                    }

                    abortControllerRef.current = new AbortController()
                    const fetchTimeoutId = setTimeout(
                        () => abortControllerRef.current?.abort(),
                        REQUEST_TIMEOUT
                    )

                    // Fetch balances and prices in parallel
                    const [balancesResult, pricesResult] = await Promise.all([
                        chainHandler.fetchBalances(account.publicKey),
                        chainHandler.fetchPrices().catch(err => {
                            logger.warn(`Error fetching prices for ${account.id}:`, err)
                            return cached?.prices || {}
                        })
                    ])

                    clearTimeout(fetchTimeoutId)

                    if (!balancesResult?.balances || !Array.isArray(balancesResult.balances)) {
                        throw new Error('Invalid balance data received')
                    }

                    // Update cache with successful result
                    const newCacheEntry = {
                        balances: balancesResult.balances,
                        prices: pricesResult,
                        timestamp: now,
                    }
                    walletCache.set(account.id, newCacheEntry)

                    setTokenData({
                        balances: balancesResult.balances,
                        prices: pricesResult,
                    })

                    // Calculate total value
                    const totalValue = balancesResult.balances.reduce((sum, balance) => {
                        const price = pricesResult[balance.token.symbol]?.price ?? 0
                        const amount = Number(balance.balance) / Math.pow(10, balance.token.decimals)
                        const value = amount * price
                        return sum + (isFinite(value) ? value : 0)
                    }, 0)

                    if (isFinite(totalValue)) {
                        onUpdateValue?.(account.id, totalValue)
                    }

                    setError(null)
                    setRetryCount(0)
                    setLastFetchTime(now)
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
                    logger.warn(`Error fetching wallet data (${account.id}): ${errorMessage}`)
                    
                    // Update cache with error but keep existing data
                    if (cached) {
                        cached.error = errorMessage
                        walletCache.set(account.id, cached)
                    }
                    
                    setError(errorMessage)

                    if (shouldRetry && retryCount < MAX_RETRIES) {
                        const nextRetryDelay = RETRY_DELAY * Math.pow(2, retryCount)
                        setRetryCount(prev => prev + 1)
                        setTimeout(() => fetchData(true), nextRetryDelay)
                    }
                } finally {
                    setIsLoading(false)
                    abortControllerRef.current = undefined
                    debouncedFetches.delete(account.id)
                }
            }, 1000) // 1 second debounce

            debouncedFetches.set(account.id, timeoutId)
        },
        [account.chain, account.publicKey, account.id, chainHandler, onUpdateValue, retryCount]
    )

    useEffect(() => {
        if (account.chain && account.publicKey && chainHandler) {
            fetchData()
            const intervalId = setInterval(() => fetchData(false), MAX_REFRESH_INTERVAL)
            return () => {
                clearInterval(intervalId)
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                }
            }
        }
        return undefined
    }, [account.chain, account.publicKey, chainHandler, fetchData])

    const formattedBalances = useMemo(() => {
        if (!account.chain) return []

        return tokenData.balances
            .filter(balance => {
                const amount = Number(balance.balance) / Math.pow(10, balance.token.decimals)
                // Only filter out dust amounts and zero balances
                if (amount <= 0) return false

                const price = tokenData.prices[balance.token.symbol]?.price ?? 0
                const value = amount * price
                const chainInfo = getChainInfo(account.chain)
                const isMainToken = balance.token.symbol === chainInfo.nativeToken
                const isMajorToken = ['BTC', 'ETH', 'SOL', 'APT', 'SUI', 'USDC', 'USDT', 'BEENZ'].includes(
                    balance.token.symbol
                )

                // Keep if: value >= $0.01 OR main chain token OR major token
                return value >= 0.01 || isMainToken || isMajorToken
            })
            .sort((a, b) => {
                const aValue =
                    (Number(a.balance) / Math.pow(10, a.token.decimals)) *
                    (tokenData.prices[a.token.symbol]?.price ?? 0)
                const bValue =
                    (Number(b.balance) / Math.pow(10, b.token.decimals)) *
                    (tokenData.prices[b.token.symbol]?.price ?? 0)
                return bValue - aValue
            })
    }, [tokenData, account.chain])

    const handleCopy = useCallback(async () => {
        if (!account.publicKey) return
        try {
            await navigator.clipboard.writeText(account.publicKey)
            setCopied(true)
            setTimeout(() => setCopied(false), COPY_TIMEOUT_MS)
        } catch (err) {
            logger.error(
                'Failed to copy address:',
                err instanceof Error ? err : new Error(String(err))
            )
        }
    }, [account.publicKey])

    const explorerUrl = useMemo(() => {
        if (!chainHandler || !account.publicKey) return '#'
        return chainHandler.getExplorerUrl(account.publicKey, account.id)
    }, [chainHandler, account.publicKey, account.id])

    return (
        <BaseCard
            account={account}
            expanded={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            variant="detailed"
            className={isOpen ? 'h-auto' : undefined}
        >
            {!compact && isOpen && (
                <div className="flex flex-col gap-3 pt-1">
                    {account.isColdStorage && (
                        <Badge
                            variant="secondary"
                            className="self-start bg-blue-500/20 text-blue-500 text-xs"
                        >
                            Cold
                        </Badge>
                    )}

                    {account.publicKey && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="font-mono text-[10px] sm:text-xs tracking-tight text-muted-foreground/80 truncate flex-1 min-w-[120px]">
                                <span>{account.publicKey.slice(0, 4)}</span>
                                <span className="opacity-50">...</span>
                                <span>{account.publicKey.slice(-4)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={e => {
                                        e.stopPropagation()
                                        handleCopy()
                                    }}
                                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                    title="Copy address"
                                >
                                    {copied ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                    )}
                                </button>
                                <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                    title="View in Explorer"
                                >
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </a>
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="text-sm text-muted-foreground animate-pulse">
                            Loading balances...
                        </div>
                    )}

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    {!isLoading && !error && formattedBalances.length > 0 && (
                        <div className="overflow-x-auto w-full">
                            <div className="grid w-full">
                                {/* Token Rows */}
                                <div className="flex flex-col gap-0.5">
                                    {formattedBalances.map(balance => {
                                        const amount = Number(
                                            (
                                                Number(balance.balance) /
                                                Math.pow(10, balance.token.decimals)
                                            ).toFixed(3)
                                        )
                                        const price = Number(
                                            (
                                                tokenData.prices[balance.token.symbol]?.price ?? 0
                                            ).toFixed(3)
                                        )

                                        return (
                                            <TokenBalance
                                                key={balance.token.symbol}
                                                token={balance.token}
                                                quantity={amount}
                                                price={price}
                                                className="grid grid-cols-3 gap-4 px-2 py-0.5 rounded-sm hover:bg-muted/50 transition-colors"
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && formattedBalances.length === 0 && (
                        <div className="text-sm text-muted-foreground">No token balances found</div>
                    )}
                </div>
            )}
        </BaseCard>
    )
}

export const WalletCard = memo(WalletCardComponent)
