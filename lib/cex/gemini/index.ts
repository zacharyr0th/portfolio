import { ExchangeHandler, TokenBalance, TokenPrice } from '../types'
import { GeminiTokenBalance } from './TokenBalance'
import { GeminiBalance } from './types'
import { logger } from '@/lib/utils/core/logger'
import {
    Cache,
    CACHE_TTL,
    CACHE_STALE_TIME,
    TOKEN_DECIMALS,
    canMakeRequest,
    wait,
    MAX_RETRIES,
    RETRY_DELAY,
    requestTimestamps,
} from '../baseHandler'
import { fetchTokenPrices } from '@/lib/data/cmc'

// Cache instances with longer TTL and stale time
const balanceCache = new Cache<TokenBalance[]>(
    CACHE_TTL * 2,  // Double the cache TTL
    CACHE_STALE_TIME * 2  // Double the stale time
)
const priceCache = new Cache<Record<string, TokenPrice>>(
    CACHE_TTL * 2,
    CACHE_STALE_TIME * 2
)

// Helper function to normalize Gemini asset names
function normalizeAssetName(currency: string): string {
    return currency.toUpperCase()
}

// Helper function to get token decimals
function getTokenDecimals(symbol: string): number {
    return TOKEN_DECIMALS[symbol] || 8
}

// Enhanced authenticated request with retries and rate limiting
async function makeAuthenticatedRequest<T>(endpoint: string): Promise<T> {
    let retries = 0
    const maxRetries = MAX_RETRIES * 2 // Double max retries

    while (retries < maxRetries) {
        try {
            if (!canMakeRequest()) {
                const waitTime = 60000 / 10 // Reduce to 10 requests per minute
                logger.info(`Rate limit reached, waiting ${waitTime}ms...`)
                await wait(waitTime)
                continue
            }

            requestTimestamps.push(Date.now())

            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

            try {
                const response = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        endpoint: endpoint.startsWith('/v1/') ? endpoint : `/v1/${endpoint}`,
                    }),
                    signal: controller.signal,
                })

                clearTimeout(timeout)

                if (!response.ok) {
                    const errorData = await response.json()
                    const errorMessage = errorData.error || errorData.message || response.statusText
                    logger.error(`Gemini API error: ${errorMessage} (status: ${response.status}, endpoint: ${endpoint}, timestamp: ${new Date().toISOString()})`)

                    // Handle rate limiting specifically
                    if (response.status === 429) {
                        const retryAfter = response.headers.get('Retry-After')
                        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000
                        logger.warn(`Rate limited by Gemini API, waiting ${waitTime}ms`)
                        await wait(waitTime)
                        continue
                    }

                    throw new Error(`Gemini API error: ${errorMessage}`)
                }

                const data = await response.json()
                if (data.error) {
                    const errorMessage = data.error || data.message
                    logger.error(`Gemini API returned error: ${errorMessage} (endpoint: ${endpoint}, timestamp: ${new Date().toISOString()})`)
                    throw new Error(`Gemini API error: ${errorMessage}`)
                }

                return data
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    logger.error(`Gemini API request timeout (endpoint: ${endpoint}, timestamp: ${new Date().toISOString()})`)
                    throw new Error('Request timeout')
                }
                throw error
            } finally {
                clearTimeout(timeout)
            }
        } catch (error) {
            retries++
            const isLastRetry = retries === maxRetries

            // Enhanced error logging
            logger.error(`Gemini request failed: ${error instanceof Error ? error.message : String(error)} (attempt: ${retries}/${maxRetries}, endpoint: ${endpoint}, timestamp: ${new Date().toISOString()})`)

            if (isLastRetry) {
                throw error
            }

            const backoffDelay = RETRY_DELAY * Math.pow(2, retries - 1) // Exponential backoff
            logger.warn(`Retrying in ${backoffDelay}ms (attempt ${retries}/${maxRetries})`)
            await wait(backoffDelay)
        }
    }

    throw new Error('Max retries exceeded')
}

async function getAccountBalance(): Promise<GeminiBalance[]> {
    return makeAuthenticatedRequest<GeminiBalance[]>('balances')
}

export const geminiHandler: ExchangeHandler = {
    fetchBalances: async () => {
        // Check cache first
        const { data: cached, isStale } = balanceCache.get('gemini')

        // If we have valid cache data and it's not stale, return it
        if (cached && !isStale) {
            logger.debug('Returning fresh cached Gemini balances')
            return { balances: cached }
        }

        // If cache is stale but we have data, trigger background refresh
        if (cached && isStale) {
            logger.debug('Cache is stale, triggering background refresh')
            getAccountBalance()
                .then(geminiBalances => {
                    const balances = geminiBalances
                        .map(balance => {
                            const symbol = normalizeAssetName(balance.currency)
                            return {
                                token: {
                                    symbol,
                                    name: symbol,
                                    decimals: getTokenDecimals(symbol),
                                },
                                balance: balance.amount,
                            }
                        })
                        .filter(balance => {
                            const numBalance = parseFloat(balance.balance)
                            // Filter out zero or very small balances (less than 0.00000001)
                            return !isNaN(numBalance) && numBalance > 0.00000001
                        })
                    balanceCache.set('gemini', balances)
                })
                .catch((error: unknown) =>
                    logger.error('Background refresh failed:', error as Error)
                )

            return { balances: cached }
        }

        // No cache or expired cache, fetch fresh data
        try {
            logger.debug('Fetching fresh Gemini balances')
            const geminiBalances = await getAccountBalance()

            const balances: TokenBalance[] = geminiBalances
                .map(balance => {
                    const symbol = normalizeAssetName(balance.currency)
                    return {
                        token: {
                            symbol,
                            name: symbol,
                            decimals: getTokenDecimals(symbol),
                        },
                        balance: balance.amount,
                    }
                })
                .filter(balance => {
                    const numBalance = parseFloat(balance.balance)
                    // Filter out zero or very small balances (less than 0.00000001)
                    return !isNaN(numBalance) && numBalance > 0.00000001
                })

            balanceCache.set('gemini', balances)
            return { balances }
        } catch (error: unknown) {
            logger.error('Error fetching Gemini balances:', error as Error)

            // Return cached data if available, even if expired
            if (cached) {
                logger.debug('Returning stale cached balances due to error')
                return { balances: cached }
            }

            return { balances: [] }
        }
    },

    fetchPrices: async () => {
        // Check cache first
        const { data: cached, isStale } = priceCache.get('gemini')

        // If we have valid cache data and it's not stale, return it
        if (cached && !isStale) {
            return cached
        }

        // If cache is stale but we have data, trigger background refresh
        if (cached && isStale) {
            logger.debug('Price cache is stale, triggering background refresh')
            geminiHandler
                .fetchBalances()
                .then(async ({ balances }) => {
                    const symbols = balances.map(b => b.token.symbol)
                    const uniqueSymbols = Array.from(new Set(symbols))
                    const cmcPrices = await fetchTokenPrices(uniqueSymbols)

                    const formattedPrices: Record<string, TokenPrice> = {}
                    for (const symbol of uniqueSymbols) {
                        const price = cmcPrices[symbol]

                        if (price) {
                            formattedPrices[symbol] = {
                                price: price.price,
                                priceChange24h: price.percent_change_24h,
                            }
                        } else if (symbol === 'USD') {
                            formattedPrices[symbol] = {
                                price: 1,
                                priceChange24h: 0,
                            }
                        }
                    }

                    priceCache.set('gemini', formattedPrices)
                })
                .catch((error: unknown) =>
                    logger.error('Background price refresh failed:', error as Error)
                )

            return cached
        }

        // No cache or expired cache, fetch fresh data
        try {
            const { balances } = await geminiHandler.fetchBalances()
            const symbols = balances.map(b => b.token.symbol)
            const uniqueSymbols = Array.from(new Set(symbols))

            const cmcPrices = await fetchTokenPrices(uniqueSymbols)
            const formattedPrices: Record<string, TokenPrice> = {}

            for (const symbol of uniqueSymbols) {
                const price = cmcPrices[symbol]

                if (price) {
                    formattedPrices[symbol] = {
                        price: price.price,
                        priceChange24h: price.percent_change_24h,
                    }
                } else if (symbol === 'USD') {
                    formattedPrices[symbol] = {
                        price: 1,
                        priceChange24h: 0,
                    }
                }
            }

            priceCache.set('gemini', formattedPrices)
            return formattedPrices
        } catch (error: unknown) {
            logger.error('Error fetching token prices:', error as Error)

            if (cached) {
                logger.debug('Returning stale cached prices due to error')
                return cached
            }

            return {}
        }
    },

    BalanceDisplay: GeminiTokenBalance,
}

export function clearCache(): void {
    balanceCache.clear()
    priceCache.clear()
}

declare module '@/lib/utils/core/logger' {
    interface Logger {
        error(message: string, metadata?: {
            error?: unknown;
            status?: number;
            endpoint?: string;
            timestamp?: string;
        }): void;
        warn(message: string, metadata?: object): void;
        info(message: string, metadata?: object): void;
        debug(message: string, metadata?: object): void;
    }
}
