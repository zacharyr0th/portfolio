import axios from 'axios'
import { ExchangeHandler, TokenBalance, TokenPrice } from '../types'
import { KrakenTokenBalance } from './TokenBalance'
import { KrakenApiResponse, KrakenBalance } from './types'
import {
    Cache,
    CACHE_TTL,
    CACHE_STALE_TIME,
    TOKEN_DECIMALS,
    canMakeRequest,
    wait,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_DELAY,
    requestTimestamps,
} from '../baseHandler'
import { fetchTokenPrices } from '@/lib/data/cmc'
import { logger } from '@/lib/utils/core/logger'

// Cache instances with longer TTL and stale time
const balanceCache = new Cache<TokenBalance[]>(
    CACHE_TTL * 2,  // Double the cache TTL
    CACHE_STALE_TIME * 2  // Double the stale time
)
const priceCache = new Cache<Record<string, TokenPrice>>(
    CACHE_TTL * 2,
    CACHE_STALE_TIME * 2
)

// Helper function to normalize Kraken asset names
function normalizeAssetName(krakenAsset: string): string {
    // Remove .S suffix for staked assets
    krakenAsset = krakenAsset.replace(/\.S$/, '')

    // Remove X or Z prefix
    if (krakenAsset.startsWith('X') || krakenAsset.startsWith('Z')) {
        krakenAsset = krakenAsset.slice(1)
    }

    // Special cases
    const specialCases: Record<string, string> = {
        XBT: 'BTC',
        XDG: 'DOGE',
        USD: 'USDT', // Map USD to USDT for price lookup
    }

    return specialCases[krakenAsset] || krakenAsset
}

// Helper function to get token decimals
function getTokenDecimals(symbol: string): number {
    return TOKEN_DECIMALS[symbol] || 8
}

// Enhanced authenticated request with retries and rate limiting
async function makeAuthenticatedRequest<T>(
    endpoint: string,
    data: Record<string, string> = {}
): Promise<T> {
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

            const response = await axios.post<KrakenApiResponse<T>>(
                `/api/kraken`,
                {
                    endpoint,
                    ...data,
                },
                {
                    timeout: REQUEST_TIMEOUT * 2, // Double the timeout
                }
            )

            if (response.data.error?.length) {
                const errorMessage = response.data.error.join(', ')
                const error = new KrakenApiError(errorMessage, {
                    endpoint,
                    timestamp: new Date().toISOString()
                })
                logger.error('Kraken API returned error', error)
                throw error
            }

            if (!response.data.result) {
                throw new Error('No data in response')
            }

            return response.data.result
        } catch (error) {
            retries++
            const isLastRetry = retries === maxRetries

            // Enhanced error logging
            const krakenError = new KrakenApiError(
                error instanceof Error ? error.message : String(error),
                {
                    attempt: retries,
                    maxRetries,
                    endpoint,
                    timestamp: new Date().toISOString()
                }
            )
            logger.error('Kraken request failed', krakenError)

            if (isLastRetry) {
                throw error
            }

            const backoffDelay = RETRY_DELAY * Math.pow(2, retries - 1) // Exponential backoff
            logger.warn(
                `Retrying in ${backoffDelay}ms (attempt ${retries}/${maxRetries})`
            )
            await wait(backoffDelay)
        }
    }

    throw new Error('Max retries exceeded')
}

async function getAccountBalance(): Promise<Record<string, string>> {
    return makeAuthenticatedRequest<Record<string, string>>('Balance')
}

class KrakenApiError extends Error {
    constructor(message: string, public metadata?: Record<string, unknown>) {
        super(message)
        this.name = 'KrakenApiError'
    }
}

export const krakenHandler: ExchangeHandler = {
    fetchBalances: async () => {
        // Check cache first
        const { data: cached, isStale } = balanceCache.get('kraken')

        // If we have valid cache data and it's not stale, return it
        if (cached && !isStale) {
            logger.info('Returning fresh cached Kraken balances')
            return { balances: cached }
        }

        // If cache is stale but we have data, trigger background refresh
        if (cached && isStale) {
            logger.info('Cache is stale, triggering background refresh')
            getAccountBalance()
                .then(krakenBalances => {
                    const balances = Object.entries(krakenBalances)
                        .map(([asset, balance]) => {
                            const symbol = normalizeAssetName(asset)
                            return {
                                token: {
                                    symbol,
                                    name: symbol,
                                    decimals: getTokenDecimals(symbol),
                                },
                                balance: balance,
                            }
                        })
                        .filter(balance => Number(balance.balance) > 0)
                    balanceCache.set('kraken', balances)
                })
                .catch((error: unknown) => {
                    const err = error instanceof Error ? error : new Error(String(error))
                    logger.error('Background refresh failed', err)
                })

            return { balances: cached }
        }

        // No cache or expired cache, fetch fresh data
        try {
            logger.info('Fetching fresh Kraken balances')
            const krakenBalances = await getAccountBalance()

            const balances: TokenBalance[] = Object.entries(krakenBalances)
                .map(([asset, balance]) => {
                    const symbol = normalizeAssetName(asset)
                    return {
                        token: {
                            symbol,
                            name: symbol,
                            decimals: getTokenDecimals(symbol),
                        },
                        balance: balance,
                    }
                })
                .filter(balance => Number(balance.balance) > 0)

            balanceCache.set('kraken', balances)
            return { balances }
        } catch (error) {
            logger.error(
                'Error fetching Kraken balances:',
                error instanceof Error ? error : new Error(String(error))
            )

            // Return cached data if available, even if expired
            if (cached) {
                logger.info('Returning stale cached balances due to error')
                return { balances: cached }
            }

            return { balances: [] }
        }
    },

    fetchPrices: async () => {
        // Check cache first
        const { data: cached, isStale } = priceCache.get('kraken')

        // If we have valid cache data and it's not stale, return it
        if (cached && !isStale) {
            return cached
        }

        // If cache is stale but we have data, trigger background refresh
        if (cached && isStale) {
            logger.info('Price cache is stale, triggering background refresh')
            krakenHandler
                .fetchBalances()
                .then(async ({ balances }) => {
                    const symbols = balances.map(b => b.token.symbol)
                    const uniqueSymbols = Array.from(new Set(symbols))
                    const cmcPrices = await fetchTokenPrices(uniqueSymbols)

                    const formattedPrices: Record<string, TokenPrice> = {}
                    for (const symbol of uniqueSymbols) {
                        const lookupSymbol = symbol === 'USD' ? 'USDT' : symbol
                        const price = cmcPrices[lookupSymbol]

                        if (price) {
                            formattedPrices[symbol] = {
                                price: price.price,
                                priceChange24h: price.percent_change_24h,
                            }
                        } else if (symbol === 'USD' || symbol === 'USDT') {
                            formattedPrices[symbol] = {
                                price: 1,
                                priceChange24h: 0,
                            }
                        }
                    }

                    priceCache.set('kraken', formattedPrices)
                })
                .catch((error: unknown) => {
                    const err = error instanceof Error ? error : new Error(String(error))
                    logger.error('Background price refresh failed', err)
                })

            return cached
        }

        // No cache or expired cache, fetch fresh data
        try {
            const { balances } = await krakenHandler.fetchBalances()
            const symbols = balances.map(b => b.token.symbol)
            const uniqueSymbols = Array.from(new Set(symbols))

            const cmcPrices = await fetchTokenPrices(uniqueSymbols)
            const formattedPrices: Record<string, TokenPrice> = {}

            for (const symbol of uniqueSymbols) {
                const lookupSymbol = symbol === 'USD' ? 'USDT' : symbol
                const price = cmcPrices[lookupSymbol]

                if (price) {
                    formattedPrices[symbol] = {
                        price: price.price,
                        priceChange24h: price.percent_change_24h,
                    }
                } else if (symbol === 'USD' || symbol === 'USDT') {
                    formattedPrices[symbol] = {
                        price: 1,
                        priceChange24h: 0,
                    }
                }
            }

            priceCache.set('kraken', formattedPrices)
            return formattedPrices
        } catch (err) {
            logger.error('Error fetching Kraken prices:', err instanceof Error ? err : new Error(String(err)))
            throw err instanceof Error ? err : new Error('Unknown error occurred')
        }
    },

    BalanceDisplay: KrakenTokenBalance,
}

export function clearCache(): void {
    balanceCache.clear()
    priceCache.clear()
}
