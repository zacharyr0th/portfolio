import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { fetchTokenPrices } from '@/lib/data/cmc'
import {
    MARKET_SECTIONS,
    SECTION_TITLES,
    MARKET_TYPES,
    CACHE_DURATION,
    REFRESH_INTERVAL,
    REQUEST_TIMEOUT,
} from './crypto-config'

interface AsyncConfig {
    maxRetries?: number
    retryDelay?: number
    timeout?: number
    refreshInterval?: number
    immediate?: boolean
}

interface AsyncState<T> {
    data: T | null
    error: Error | null
    isLoading: boolean
}

const DEFAULT_CONFIG: Required<AsyncConfig> = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 5000,
    refreshInterval: 0,
    immediate: true,
}

function useAsyncData<T>(asyncFunction: () => Promise<T>, config: AsyncConfig = {}) {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        error: null,
        isLoading: config.immediate ?? DEFAULT_CONFIG.immediate,
    })
    const [retryCount, setRetryCount] = useState(0)
    const abortControllerRef = useRef<AbortController | null>(null)

    const { maxRetries, retryDelay, timeout, refreshInterval, immediate } = {
        ...DEFAULT_CONFIG,
        ...config,
    }

    const execute = useCallback(
        async (shouldRetry = true) => {
            try {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                }
                abortControllerRef.current = new AbortController()

                setState(prev => ({ ...prev, isLoading: true, error: null }))

                const controller = abortControllerRef.current
                const timeoutId = setTimeout(() => controller.abort(), timeout)

                const data = await asyncFunction()
                clearTimeout(timeoutId)

                setState({ data, error: null, isLoading: false })
                setRetryCount(0)
                return data
            } catch (err) {
                const errorObject = err instanceof Error ? err : new Error(String(err))
                setState({ data: null, error: errorObject, isLoading: false })

                if (shouldRetry && retryCount < maxRetries) {
                    setRetryCount(prev => prev + 1)
                    setTimeout(() => execute(true), retryDelay * Math.pow(2, retryCount))
                }
                throw errorObject
            } finally {
                abortControllerRef.current = null
            }
        },
        [asyncFunction, maxRetries, retryDelay, timeout, retryCount]
    )

    useEffect(() => {
        if (immediate) {
            execute()
        }

        if (refreshInterval > 0) {
            const intervalId = setInterval(() => execute(false), refreshInterval)
            return () => {
                clearInterval(intervalId)
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                }
            }
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [execute, immediate, refreshInterval])

    return {
        ...state,
        execute,
        reset: useCallback(() => {
            setState({ data: null, error: null, isLoading: false })
            setRetryCount(0)
        }, []),
    }
}

interface MarketData {
    symbol: string
    value: string
    change: string
    isPositive: boolean
}

interface MarketSection {
    title: string
    items: MarketData[]
}

// Market data configuration
interface TokenPrice {
    price: number
    percent_change_24h: number
}

// LRU Cache implementation
class LRUCache<K, V> {
    private cache: Map<K, V>
    private maxSize: number

    constructor(maxSize: number) {
        this.cache = new Map()
        this.maxSize = maxSize
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key)
        if (value) {
            this.cache.delete(key)
            this.cache.set(key, value)
        }
        return value
    }

    set(key: K, value: V): void {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value
            if (firstKey !== undefined) {
                this.cache.delete(firstKey)
            }
        }
        this.cache.set(key, value)
    }

    clear(): void {
        this.cache.clear()
    }
}

interface CacheEntry {
    data: MarketSection[]
    timestamp: number
}

const marketDataCache = new LRUCache<string, CacheEntry>(10)

// Price formatting utilities
function formatPrice(price: number): string {
    if (price >= 1000) return `$${Math.round(price).toLocaleString()}`
    if (price >= 1) return `$${price.toFixed(2)}`
    if (price < 0.01) {
        if (price <= 0.000001) return `$${(price * 1e6).toFixed(6)}`
        if (price <= 0.00001) return `$${(price * 1e5).toFixed(5)}`
        if (price <= 0.0001) return `$${(price * 1e4).toFixed(4)}`
        if (price <= 0.001) return `$${(price * 1e3).toFixed(3)}`
        return `$${price.toFixed(6)}`
    }
    return `$${price.toFixed(2)}`
}

function formatPercent(percent: number): string {
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(1)}%`
}

interface UseMarketDataResult {
    crypto: {
        sections: MarketSection[]
        loading: boolean
        error: string | null
        lastUpdated: Date | null
    }
    refetch: () => Promise<void>
}

// Main hook
export function useMarketData(
    options: {
        refreshInterval?: number
    } = {}
): UseMarketDataResult {
    const { refreshInterval = REFRESH_INTERVAL } = options

    const allSymbols = useMemo(() => {
        const symbols = new Set<string>()
        Object.values(MARKET_SECTIONS).forEach(sectionSymbols => {
            sectionSymbols.forEach(symbol => symbols.add(symbol))
        })
        return Array.from(symbols)
    }, [])

    const processSectionData = useCallback(
        (
            sectionKey: keyof typeof MARKET_SECTIONS,
            symbols: readonly string[],
            prices: Record<string, TokenPrice>
        ): MarketSection => {
            return {
                title: SECTION_TITLES[sectionKey],
                items: symbols.map(symbol => {
                    const price = prices[symbol]
                    return {
                        symbol,
                        value: price ? formatPrice(price.price) : 'N/A',
                        change: price ? formatPercent(price.percent_change_24h) : 'N/A',
                        isPositive: price ? price.percent_change_24h >= 0 : false,
                    }
                }),
            }
        },
        []
    )

    const processMarketData = useCallback(
        (
            prices: Record<string, TokenPrice>,
            marketType: keyof typeof MARKET_TYPES
        ): MarketSection[] => {
            return MARKET_TYPES[marketType].map(sectionKey => {
                const sectionSymbols = MARKET_SECTIONS[sectionKey as keyof typeof MARKET_SECTIONS]
                return processSectionData(
                    sectionKey as keyof typeof MARKET_SECTIONS,
                    sectionSymbols,
                    prices
                )
            })
        },
        [processSectionData]
    )

    const fetchMarketData = useCallback(async () => {
        if (allSymbols.length === 0) {
            return []
        }

        const cacheKey = allSymbols.sort().join(',')
        const cachedData = marketDataCache.get(cacheKey)

        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return cachedData.data
        }

        const prices = await fetchTokenPrices(allSymbols)

        if (!prices || Object.keys(prices).length === 0) {
            throw new Error('No prices returned from API')
        }

        const cryptoSections = processMarketData(prices, 'crypto')

        marketDataCache.set(cacheKey, {
            data: cryptoSections,
            timestamp: Date.now(),
        })

        return cryptoSections
    }, [allSymbols, processMarketData])

    const {
        data: sections,
        isLoading,
        error,
        execute: refetch,
    } = useAsyncData(fetchMarketData, {
        refreshInterval,
        timeout: REQUEST_TIMEOUT,
        maxRetries: 3,
    })

    const result = useMemo(() => {
        const now = sections ? new Date() : null
        return {
            crypto: {
                sections: sections || [],
                loading: isLoading,
                error: error?.message || null,
                lastUpdated: now,
            },
            refetch: async () => {
                await refetch()
            },
        }
    }, [sections, isLoading, error, refetch])

    return result
}

// For backward compatibility with existing Finnhub usage
export function useFinnhubMarketData() {
    return {
        sections: [],
        loading: false,
        error: null,
        lastUpdated: null,
    }
}
