import { createCache } from '@/lib/utils/core/performance'
import { logger } from '@/lib/utils/core/logger'

// Types
export interface TokenPrice {
    symbol: string
    price: number
    last_updated: string
    percent_change_24h: number
}

// Constants
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache
const BATCH_SIZE = 100 // Maximum symbols per request
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second
const REQUEST_TIMEOUT = 10000 // 10 seconds

// Initialize cache with 5MB limit and 5-minute TTL
const cache = createCache({
    maxSize: 5 * 1024 * 1024,
    maxItems: 1000,
    namespace: 'token-prices',
})

// Helper function to chunk array into batches
function chunkArray<T>(array: readonly T[], size: number): readonly T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
        array.slice(i * size, i * size + size)
    )
}

// Helper function to delay execution
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to retry failed requests with exponential backoff
async function retryOperation<T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES,
    delayMs: number = RETRY_DELAY
): Promise<T> {
    try {
        return await operation()
    } catch (error) {
        if (retries > 0) {
            await delay(delayMs)
            return retryOperation(operation, retries - 1, delayMs * 2)
        }
        throw error
    }
}

// Price fetching with improved error handling and caching
export async function fetchTokenPrices(
    symbols: readonly string[]
): Promise<Readonly<Record<string, TokenPrice>>> {
    const prices: Record<string, TokenPrice> = {}
    const symbolsToFetch = new Set(symbols)

    // Check cache first
    for (const symbol of symbols) {
        const cacheKey = `price-${symbol}`
        const cached = cache.get(cacheKey)
        if (cached) {
            prices[symbol] = cached as TokenPrice
            symbolsToFetch.delete(symbol)
        }
    }

    // Fetch uncached prices
    if (symbolsToFetch.size > 0) {
        try {
            const symbolBatches = chunkArray(Array.from(symbolsToFetch), BATCH_SIZE)

            for (const batch of symbolBatches) {
                const response = await retryOperation(async () => {
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

                    try {
                        const res = await fetch(`/api/cmc?symbol=${batch.join(',')}`, {
                            signal: controller.signal,
                        })

                        if (!res.ok) {
                            const errorData = await res.json()
                            throw new Error(errorData.error || 'Failed to fetch prices')
                        }

                        const data = await res.json()
                        return data as Record<string, TokenPrice>
                    } finally {
                        clearTimeout(timeoutId)
                    }
                })

                // Process response and update cache
                for (const [symbol, price] of Object.entries(response)) {
                    if (
                        price &&
                        typeof price.price === 'number' &&
                        !isNaN(price.price) &&
                        isFinite(price.price)
                    ) {
                        prices[symbol] = price
                        cache.set(`price-${symbol}`, price, CACHE_TTL)
                    }
                }
            }
        } catch (error) {
            logger.error(
                'Error fetching prices:',
                error instanceof Error ? error : new Error(String(error))
            )
            // Return cached prices for failed fetches
            for (const symbol of Array.from(symbolsToFetch)) {
                const cacheKey = `price-${symbol}`
                const cached = cache.get(cacheKey)
                if (cached) {
                    prices[symbol] = cached as TokenPrice
                }
            }
            // Rethrow error if no cached data available
            if (Object.keys(prices).length === 0) {
                throw error
            }
        }
    }

    return Object.freeze(prices)
}
