import type { ChainHandler } from './types'
import { aptosHandler, clearCache as clearAptosCache } from './aptos'
import { solanaHandler, clearCache as clearSolanaCache } from './solana'
import { suiHandler, clearCache as clearSuiCache } from './sui'
import { logger } from '@/lib/utils/core/logger'
import { ChainType } from './types'
import { isValidChain } from './config'

// Chain handlers with type safety
export const chainHandlers: Readonly<Record<ChainType, ChainHandler>> = Object.freeze({
    aptos: aptosHandler,
    solana: solanaHandler,
    sui: suiHandler,
})

// Utility function to get a chain handler with type safety and error handling
export const getChainHandler = (chain: string): ChainHandler | null => {
    if (!chain) {
        logger.warn('No chain specified when getting chain handler')
        return null
    }

    if (!isValidChain(chain)) {
        logger.warn(`Unsupported chain requested: ${chain}`)
        return null
    }

    const handler = chainHandlers[chain]
    if (!handler) {
        logger.error(`Handler not found for supported chain: ${chain}`)
        return null
    }

    return handler
}

// Export cleanup function for tests and hot reloading
export const clearAllCaches = () => {
    try {
        clearAptosCache()
        clearSolanaCache()
        clearSuiCache()
        logger.debug('Successfully cleared all chain handler caches')
    } catch (error) {
        logger.error(
            `Error clearing chain handler caches: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
    }
}

// Re-export types and config
export * from './types'
export * from './config'
