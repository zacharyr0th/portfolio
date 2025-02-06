import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react'
import { BaseCard } from '../BaseCard'
import { Copy, Check, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { TokenBalance } from '../TokenBalance'
import { NftModal } from '../modals/NftModal'
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
import { useLocalStorage } from '@/lib/utils/hooks/useLocalStorage'

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
    showHiddenTokens?: boolean
}

function WalletCardComponent({
    account,
    compact = false,
    isExpanded = false,
    onUpdateValue,
    showHiddenTokens = false,
}: WalletCardProps) {
    const [copied, setCopied] = useState(false)
    const [isOpen, setIsOpen] = useState(isExpanded)
    const [showNftModal, setShowNftModal] = useState(false)
    const [tokenData, setTokenData] = useState<{
        balances: ChainTokenBalance[]
        prices: Record<string, ChainTokenPrice>
    }>({ balances: [], prices: {} })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [lastFetchTime, setLastFetchTime] = useState(0)
    const abortControllerRef = useRef<AbortController>()
    const lastValueRef = useRef<number>(0)
    
    // Add hidden tokens state
    const [hiddenTokens, setHiddenTokens] = useLocalStorage<Record<string, string[]>>(
        'hidden-tokens',
        {}
    )

    const toggleHideToken = useCallback((symbol: string) => {
        setHiddenTokens((prev: Record<string, string[]>) => {
            const walletHidden = prev[account.id] || []
            const isHidden = walletHidden.includes(symbol)
            
            if (isHidden) {
                // Remove from hidden list
                return {
                    ...prev,
                    [account.id]: walletHidden.filter((s: string) => s !== symbol)
                }
            } else {
                // Add to hidden list
                return {
                    ...prev,
                    [account.id]: [...walletHidden, symbol]
                }
            }
        })
    }, [account.id, setHiddenTokens])

    useEffect(() => {
        setIsOpen(isExpanded)
    }, [isExpanded])

    const chainHandler = useMemo(() => {
        logger.debug(`Initializing chain handler for ${account.chain} wallet: ${account.id}`)
        if (!account.chain || !isValidChain(account.chain)) {
            logger.warn(`Invalid chain ${account.chain} for wallet: ${account.id}`)
            setError(`Invalid chain: ${account.chain}`)
            return null
        }
        const handler = chainHandlers[account.chain]
        if (!handler) {
            logger.error(`Handler not found for chain ${account.chain} (wallet: ${account.id})`)
            setError(`Unsupported chain: ${account.chain}`)
            return null
        }
        return handler
    }, [account.chain, account.id])

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(account.publicKey)
        setCopied(true)
        setTimeout(() => setCopied(false), COPY_TIMEOUT_MS)
    }, [account.publicKey])

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

                    // Fetch balances
                    const balancesResult = await chainHandler.fetchBalances(account.publicKey)

                    // Enhance token metadata for unknown tokens
                    balancesResult.balances = balancesResult.balances.map(balance => {
                        if (!balance.token.symbol || balance.token.symbol === 'Unknown Token') {
                            // Get token address based on chain type
                            let tokenAddress = ''
                            if ('address' in balance.token && typeof balance.token.address === 'string') {
                                tokenAddress = balance.token.address
                            } else if ('tokenAddress' in balance.token && typeof balance.token.tokenAddress === 'string') {
                                tokenAddress = balance.token.tokenAddress
                            }

                            const shortAddr = tokenAddress ? 
                                `${tokenAddress.substring(0, 4)}...${tokenAddress.substring(-4)}` : 
                                'Unknown'

                            // Create chain-specific token object
                            const baseToken = {
                                symbol: shortAddr,
                                name: tokenAddress || 'Unknown Token',
                                decimals: balance.token.decimals,
                            }

                            switch (account.chain) {
                                case 'solana':
                                    return {
                                        ...balance,
                                        token: {
                                            symbol: shortAddr,
                                            name: tokenAddress || 'Unknown Token',
                                            decimals: balance.token.decimals,
                                            tokenAddress: tokenAddress,
                                            chainId: 101, // Solana mainnet
                                            verified: false,
                                        }
                                    } as ChainTokenBalance
                                case 'aptos':
                                case 'sui':
                                    return {
                                        ...balance,
                                        token: {
                                            symbol: shortAddr,
                                            name: tokenAddress || 'Unknown Token',
                                            decimals: balance.token.decimals,
                                            tokenAddress: tokenAddress,
                                        }
                                    } as ChainTokenBalance
                                default:
                                    return balance
                            }
                        }
                        return balance
                    })

                    // Fetch prices based on chain type
                    let pricesResult = cached?.prices || {}
                    if (account.chain === 'solana') {
                        try {
                            // Extract token addresses for Solana tokens
                            const tokenAddresses = balancesResult.balances
                                .filter((b): b is ChainTokenBalance & { token: { address: string } } => 
                                    'address' in b.token && 
                                    typeof b.token.address === 'string' &&
                                    b.token.address.length > 0
                                )
                                .map(b => b.token.address)

                            if (tokenAddresses.length > 0) {
                                const response = await fetch(`/api/prices?tokens=${tokenAddresses.join(',')}`)
                                if (response.ok) {
                                    const data = await response.json()
                                    const prices = data.prices as Record<string, number>
                                    
                                    // Convert Jupiter prices to the format expected by the component
                                    pricesResult = Object.entries(prices).reduce((acc, [address, price]) => {
                                        const token = balancesResult.balances.find(b => 
                                            'address' in b.token && 
                                            b.token.address === address
                                        )
                                        if (token) {
                                            acc[token.token.symbol] = {
                                                price: Number(price),
                                                priceChange24h: 0,
                                                lastUpdated: Date.now(),
                                            }
                                        }
                                        return acc
                                    }, {} as Record<string, ChainTokenPrice>)

                                    // Log successful price fetches for debugging
                                    logger.debug('Fetched Jupiter prices:', {
                                        accountId: account.id,
                                        tokenCount: Object.keys(prices).length,
                                        tokens: Object.keys(pricesResult).join(', ')
                                    })
                                } else {
                                    throw new Error(`Jupiter API returned ${response.status}`)
                                }
                            }
                        } catch (priceError) {
                            logger.warn('Error fetching Jupiter prices:', {
                                accountId: account.id,
                                error: priceError instanceof Error ? priceError.message : String(priceError),
                                tokens: balancesResult.balances.map(b => ({
                                    symbol: b.token.symbol,
                                    address: 'address' in b.token ? b.token.address : undefined
                                }))
                            })
                        }
                    } else {
                        // Use chain-specific price fetching for other chains
                        pricesResult = await chainHandler.fetchPrices().catch(err => {
                            logger.warn(`Error fetching prices for ${account.id}:`, err)
                            return cached?.prices || {}
                        })
                    }

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

    // Memoize the filtered balances calculation
    const filteredBalances = useMemo(() => {
        const walletHidden = hiddenTokens[account.id] || []
        return tokenData.balances
            .filter(balance => {
                // Calculate token amount
                const amount = Number(balance.balance) / Math.pow(10, balance.token.decimals)
                
                // Skip tokens with zero balance
                if (amount === 0) return false
                
                // Show all tokens if showHiddenTokens is true
                if (showHiddenTokens) return true
                
                // Otherwise filter out hidden tokens
                return !walletHidden.includes(balance.token.symbol)
            })
            .sort((a, b) => {
                const aAmount = Number(a.balance) / Math.pow(10, a.token.decimals)
                const bAmount = Number(b.balance) / Math.pow(10, b.token.decimals)
                const aValue = aAmount * (tokenData.prices[a.token.symbol]?.price || 0)
                const bValue = bAmount * (tokenData.prices[b.token.symbol]?.price || 0)
                return bValue - aValue
            })
    }, [tokenData.balances, tokenData.prices, hiddenTokens, account.id, showHiddenTokens])

    // Memoize the total value calculation
    const totalValue = useMemo(() => {
        const newValue = filteredBalances.reduce((sum, balance) => {
            const amount = Number(balance.balance) / Math.pow(10, balance.token.decimals)
            const price = tokenData.prices[balance.token.symbol]?.price || 0
            return sum + (amount * price)
        }, 0)
        
        // Only update if the value has changed significantly (more than 0.01%)
        if (Math.abs(newValue - lastValueRef.current) / (lastValueRef.current || 1) > 0.0001) {
            lastValueRef.current = newValue
            return newValue
        }
        return lastValueRef.current
    }, [filteredBalances, tokenData.prices])

    // Notify parent of value changes
    useEffect(() => {
        if (onUpdateValue && !isLoading && !error && isFinite(totalValue)) {
            onUpdateValue(account.id, totalValue)
        }
    }, [account.id, totalValue, onUpdateValue, isLoading, error])

    return (
        <>
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
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="font-mono text-xs text-muted-foreground truncate">
                                {account.publicKey}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="p-1 hover:bg-accent rounded-md transition-colors"
                                aria-label="Copy address"
                            >
                                {copied ? (
                                    <Check className="h-3.5 w-3.5 text-success" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                            </button>
                            <a
                                href={(() => {
                                    switch (account.chain) {
                                        case 'aptos':
                                            return `https://explorer.aptoslabs.com/account/${account.publicKey}/coins?network=mainnet`
                                        case 'sui':
                                            return `https://suiscan.xyz/mainnet/account/${account.publicKey}`
                                        default:
                                            return getChainInfo(account.chain).explorer + '/address/' + account.publicKey
                                    }
                                })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-accent rounded-md transition-colors"
                                aria-label="View on explorer"
                            >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                        </div>
                        <div className="flex flex-col gap-1">
                            {filteredBalances.map(balance => {
                                const amount = Number(balance.balance) / Math.pow(10, balance.token.decimals)
                                const price = tokenData.prices[balance.token.symbol]?.price || 0
                                const walletHidden = hiddenTokens[account.id] || []
                                const isHidden = walletHidden.includes(balance.token.symbol)
                                
                                // Get token address for key
                                const tokenAddress = 'tokenAddress' in balance.token ? balance.token.tokenAddress : undefined
                                const uniqueKey = tokenAddress ? 
                                    `${account.id}-${tokenAddress}` : 
                                    `${account.id}-${balance.token.symbol}`
                                
                                return (
                                    <TokenBalance
                                        key={uniqueKey}
                                        token={{
                                            symbol: balance.token.symbol,
                                            name: balance.token.name,
                                            decimals: balance.token.decimals,
                                            address: tokenAddress
                                        }}
                                        quantity={amount}
                                        price={price}
                                        showPrice
                                        compact={compact}
                                        canHide={true}
                                        onHide={() => toggleHideToken(balance.token.symbol)}
                                        isHidden={isHidden}
                                        showHiddenTokens={showHiddenTokens}
                                        chainType={account.chain}
                                    />
                                )
                            })}
                        </div>
                        <div className="pt-2 border-t border-border">
                            <button
                                onClick={() => setShowNftModal(true)}
                                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-md transition-colors"
                            >
                                <ImageIcon className="h-3.5 w-3.5" />
                                View NFTs
                            </button>
                        </div>
                    </div>
                )}
            </BaseCard>
            
            <NftModal
                isOpen={showNftModal}
                onClose={() => setShowNftModal(false)}
                walletAddress={account.publicKey}
                chain={account.chain}
            />
        </>
    )
}

export const WalletCard = memo(WalletCardComponent)
