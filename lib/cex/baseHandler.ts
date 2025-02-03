import { TokenBalance, TokenPrice } from './types'

// Cache implementation with stale-while-revalidate pattern
export class Cache<T> {
    private cache: Map<string, { data: T; timestamp: number; staleAt: number }> = new Map()
    private readonly ttl: number
    private readonly staleTime: number

    constructor(ttl: number, staleTime?: number) {
        this.ttl = ttl
        this.staleTime = staleTime || ttl * 0.5 // Default stale time is half of TTL
    }

    get(key: string): { data: T | null; isStale: boolean } {
        const entry = this.cache.get(key)
        if (!entry) return { data: null, isStale: true }

        const now = Date.now()
        if (now - entry.timestamp > this.ttl) {
            this.cache.delete(key)
            return { data: null, isStale: true }
        }

        return {
            data: entry.data,
            isStale: now - entry.timestamp > this.staleTime,
        }
    }

    set(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            staleAt: Date.now() + this.staleTime,
        })
    }

    clear(): void {
        this.cache.clear()
    }
}

// Request utilities
export const REQUEST_TIMEOUT = 10000 // 10 seconds
export const MAX_RETRIES = 3
export const RETRY_DELAY = 1000 // 1 second

// Rate limiting
export const REQUESTS_PER_MINUTE = 15
export const requestTimestamps: number[] = []

export function canMakeRequest(): boolean {
    const now = Date.now()
    // Remove timestamps older than 1 minute
    while (
        requestTimestamps.length > 0 &&
        requestTimestamps[0] !== undefined &&
        requestTimestamps[0] < now - 60000
    ) {
        requestTimestamps.shift()
    }
    return requestTimestamps.length < REQUESTS_PER_MINUTE
}

export async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Constants
export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
export const CACHE_STALE_TIME = 2 * 60 * 1000 // 2 minutes

// Known token decimals
export const TOKEN_DECIMALS: Record<string, number> = {
    BTC: 8,
    ETH: 18,
    SOL: 9,
    APT: 8,
    USDC: 6,
    USDT: 6,
    USD: 2,
    EUR: 2,
}
