import { createCache } from '@/lib/utils/core/performance'
import { logger } from '@/lib/utils/core/logger'
import type { ChainHandler, ChainTokenBalance, ChainTokenPrice, BalanceDisplayProps } from './types'
import type { ComponentType } from 'react'

// Constants shared across all handlers
export const HANDLER_CONSTANTS = {
    REQUEST_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    CACHE_DURATION: 900000, // 15 minutes
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    MAX_REQUESTS_PER_WINDOW: 30,
    CACHE_LIMITS: {
        BALANCE_SIZE: 10 * 1024 * 1024, // 10MB
        BALANCE_ITEMS: 1000,
        PRICE_SIZE: 5 * 1024 * 1024, // 5MB
        PRICE_ITEMS: 500,
    },
} as const

export interface BaseHandlerConfig {
    chainName: string
    fetchBalancesImpl: (publicKey: string) => Promise<{ balances: ChainTokenBalance[] }>
    fetchPricesImpl: () => Promise<Record<string, ChainTokenPrice>>
    getExplorerUrlImpl: (publicKey: string, accountId: string) => string
    BalanceDisplayComponent: ComponentType<BalanceDisplayProps>
}

export class BaseChainHandler implements ChainHandler {
    protected readonly config: BaseHandlerConfig
    private readonly balanceCache
    private readonly priceCache
    private readonly requestTimestamps: number[]
    private readonly pendingRequests: Map<string, Promise<any>>

    constructor(config: BaseHandlerConfig) {
        this.config = config
        this.balanceCache = createCache<ChainTokenBalance[]>({
            maxSize: HANDLER_CONSTANTS.CACHE_LIMITS.BALANCE_SIZE,
            maxItems: HANDLER_CONSTANTS.CACHE_LIMITS.BALANCE_ITEMS,
            namespace: `${config.chainName}-balances`,
        })
        this.priceCache = createCache<Record<string, ChainTokenPrice>>({
            maxSize: HANDLER_CONSTANTS.CACHE_LIMITS.PRICE_SIZE,
            maxItems: HANDLER_CONSTANTS.CACHE_LIMITS.PRICE_ITEMS,
            namespace: `${config.chainName}-prices`,
        })
        this.requestTimestamps = []
        this.pendingRequests = new Map()
    }

    private canMakeRequest(): boolean {
        const now = Date.now()
        // Remove timestamps older than the window
        while (
            this.requestTimestamps.length > 0 &&
            (this.requestTimestamps[0] || 0) < now - HANDLER_CONSTANTS.RATE_LIMIT_WINDOW
        ) {
            this.requestTimestamps.shift()
        }
        return this.requestTimestamps.length < HANDLER_CONSTANTS.MAX_REQUESTS_PER_WINDOW
    }

    protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null
        for (let i = 0; i < HANDLER_CONSTANTS.MAX_RETRIES; i++) {
            try {
                if (!this.canMakeRequest()) {
                    await new Promise(resolve =>
                        setTimeout(
                            resolve,
                            Math.floor(
                                HANDLER_CONSTANTS.RATE_LIMIT_WINDOW /
                                    HANDLER_CONSTANTS.MAX_REQUESTS_PER_WINDOW
                            )
                        )
                    )
                    continue
                }

                this.requestTimestamps.push(Date.now())
                return await fn()
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                if (i < HANDLER_CONSTANTS.MAX_RETRIES - 1) {
                    await new Promise(resolve =>
                        setTimeout(resolve, HANDLER_CONSTANTS.RETRY_DELAY * Math.pow(2, i))
                    )
                }
            }
        }
        throw lastError ?? new Error('Max retries exceeded')
    }

    async fetchBalances(publicKey: string): Promise<{ balances: ChainTokenBalance[] }> {
        logger.debug(`Fetching balances for ${this.config.chainName} wallet: ${publicKey}`)

        if (!publicKey?.trim()) {
            logger.warn('No public key provided')
            return { balances: [] }
        }

        // Check cache first
        const cached = this.balanceCache.get(publicKey)
        if (cached) {
            logger.debug(`${this.config.chainName}: Returning cached balances`)
            return { balances: cached }
        }

        // Check for pending request
        const pendingKey = `balances:${publicKey}`
        const pendingRequest = this.pendingRequests.get(pendingKey)
        if (pendingRequest) {
            logger.debug(`${this.config.chainName}: Returning pending request`)
            return pendingRequest
        }

        try {
            const request = this.withRetry(async () => {
                const result = await this.config.fetchBalancesImpl(publicKey)
                if (!result?.balances) {
                    throw new Error('Invalid response structure')
                }
                return result
            })

            this.pendingRequests.set(pendingKey, request)
            const response = await request

            // Cache successful results
            this.balanceCache.set(publicKey, response.balances)
            return response
        } catch (error) {
            logger.warn(
                `Error fetching ${this.config.chainName} balances: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            )
            throw error
        } finally {
            this.pendingRequests.delete(pendingKey)
        }
    }

    async fetchPrices(): Promise<Record<string, ChainTokenPrice>> {
        try {
            // Check cache first
            const cached = this.priceCache.get('prices')
            if (cached) {
                return cached
            }

            const controller = new AbortController()
            const timeoutId = setTimeout(
                () => controller.abort(),
                HANDLER_CONSTANTS.REQUEST_TIMEOUT
            )

            const prices = await this.withRetry(async () => {
                try {
                    const result = await this.config.fetchPricesImpl()
                    if (!result) throw new Error('No price data received')
                    return result
                } finally {
                    clearTimeout(timeoutId)
                }
            })

            // Cache the results
            this.priceCache.set('prices', prices)
            return prices
        } catch (error) {
            logger.error(
                `Error fetching ${this.config.chainName} prices: ${error instanceof Error ? error.message : 'Unknown error'}`
            )

            // Return cached data if available
            const cached = this.priceCache.get('prices')
            if (cached) {
                logger.debug('Returning stale cached prices due to error')
                return cached
            }

            return {}
        }
    }

    getExplorerUrl(publicKey: string, accountId: string): string {
        return this.config.getExplorerUrlImpl(publicKey, accountId)
    }

    get BalanceDisplay(): ComponentType<BalanceDisplayProps> {
        return this.config.BalanceDisplayComponent
    }

    clearCache(): void {
        this.balanceCache.clear()
        this.priceCache.clear()
    }
}
