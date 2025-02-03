import type { ExchangeHandler } from './types'
import { krakenHandler } from './kraken'
import { geminiHandler } from './gemini'

// Supported exchange identifiers
export type SupportedExchange = 'kraken' | 'coinbase' | 'gemini'

// Exchange handlers with type safety
export const exchangeHandlers: Partial<Record<SupportedExchange, ExchangeHandler>> = {
    kraken: krakenHandler,
    gemini: geminiHandler,
    // coinbase: coinbaseHandler, // TODO: Implement
} as const

// Utility function to check if an exchange is supported
export const isSupportedExchange = (exchange: string): exchange is SupportedExchange =>
    exchange in exchangeHandlers

// Re-export types
export * from './types'
