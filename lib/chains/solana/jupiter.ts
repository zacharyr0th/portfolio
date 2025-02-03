import { logger } from '@/lib/utils/core/logger'
import type { JupiterToken, PriceQuote } from './types'
import { SOLANA_TOKENS } from './constants'

// Token Constants
export const JUPITER_TOKENS = {
    BEENZ: '9sbrLLnk4vxJajnZWXP9h5qk1NDFw7dz2eHjgemcpump',
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
} as const

const JUPITER_API_BASE_URL = 'https://quote-api.jup.ag/v6'
const JUPITER_PRICE_CACHE = new Map<string, { quote: PriceQuote; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds
const DEFAULT_SLIPPAGE_BPS = 100 // 1%

// Types for Jupiter API responses
export interface JupiterQuoteResponse {
    inputMint: string
    inAmount: string
    outputMint: string
    outAmount: string
    otherAmountThreshold: string
    swapMode: 'ExactIn' | 'ExactOut'
    slippageBps: number
    platformFee?: {
        amount: string
        feeBps: number
    }
    priceImpactPct: string
    routePlan: Array<{
        swapInfo: {
            ammKey: string
            label?: string
            inputMint: string
            outputMint: string
            inAmount: string
            outAmount: string
            feeAmount: string
            feeMint: string
            percent: number
        }
    }>
    contextSlot?: number
    timeTaken?: number
}

export interface JupiterQuoteParams {
    inputMint: string
    outputMint: string
    amount: number
    slippageBps?: number
    swapMode?: 'ExactIn' | 'ExactOut'
    dexes?: string[]
    excludeDexes?: string[]
    restrictIntermediateTokens?: boolean
    onlyDirectRoutes?: boolean
    asLegacyTransaction?: boolean
    platformFeeBps?: number
    maxAccounts?: number
    autoSlippage?: boolean
    maxAutoSlippageBps?: number
    autoSlippageCollisionUsdValue?: number
}

/**
 * Get a quote from Jupiter API
 * @param params Quote parameters
 * @returns Quote response
 */
export async function getJupiterQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse> {
    try {
        // Construct query parameters
        const queryParams = new URLSearchParams({
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            amount: params.amount.toString(),
            slippageBps: (params.slippageBps ?? DEFAULT_SLIPPAGE_BPS).toString(),
        })

        // Add optional parameters
        if (params.swapMode) queryParams.append('swapMode', params.swapMode)
        if (params.dexes?.length) queryParams.append('dexes', params.dexes.join(','))
        if (params.excludeDexes?.length) queryParams.append('excludeDexes', params.excludeDexes.join(','))
        if (params.restrictIntermediateTokens) queryParams.append('restrictIntermediateTokens', 'true')
        if (params.onlyDirectRoutes) queryParams.append('onlyDirectRoutes', 'true')
        if (params.asLegacyTransaction) queryParams.append('asLegacyTransaction', 'true')
        if (params.platformFeeBps) queryParams.append('platformFeeBps', params.platformFeeBps.toString())
        if (params.maxAccounts) queryParams.append('maxAccounts', params.maxAccounts.toString())
        if (params.autoSlippage) queryParams.append('autoSlippage', 'true')
        if (params.maxAutoSlippageBps) queryParams.append('maxAutoSlippageBps', params.maxAutoSlippageBps.toString())
        if (params.autoSlippageCollisionUsdValue) {
            queryParams.append('autoSlippageCollisionUsdValue', params.autoSlippageCollisionUsdValue.toString())
        }

        const response = await fetch(`${JUPITER_API_BASE_URL}/quote?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Jupiter API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        return data as JupiterQuoteResponse

    } catch (error) {
        logger.error('Error fetching Jupiter quote', error instanceof Error ? error : new Error(String(error)))
        throw error
    }
}

/**
 * Get token price in USDC using Jupiter quote
 * @param tokenMint Token mint address
 * @param amount Optional amount to get quote for (defaults to 1 token)
 * @returns Price quote with metadata
 */
export async function getJupiterTokenPrice(
    tokenMint: string,
    amount?: number
): Promise<PriceQuote> {
    try {
        // Check cache first
        const cached = JUPITER_PRICE_CACHE.get(tokenMint)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.quote
        }

        // Get decimals for the token (default to 6 if unknown)
        const decimals = 6 // You might want to fetch this from a token list or pass it in
        const baseAmount = amount ?? Math.pow(10, decimals) // Default to 1 token

        const quote = await getJupiterQuote({
            inputMint: tokenMint,
            outputMint: SOLANA_TOKENS.USDC,
            amount: baseAmount,
            slippageBps: DEFAULT_SLIPPAGE_BPS,
            restrictIntermediateTokens: true,
        })

        // Calculate price and confidence
        const outAmount = Number(quote.outAmount) / Math.pow(10, 6) // USDC has 6 decimals
        const inAmount = Number(quote.inAmount) / Math.pow(10, decimals)
        const price = outAmount / inAmount
        const priceImpact = Math.abs(parseFloat(quote.priceImpactPct))
        const confidence = Math.max(0, Math.min(1, 1 - priceImpact / 100))

        const priceQuote: PriceQuote = {
            price,
            source: 'jupiter',
            timestamp: Date.now(),
            confidence,
        }

        // Cache the result
        JUPITER_PRICE_CACHE.set(tokenMint, {
            quote: priceQuote,
            timestamp: Date.now(),
        })

        return priceQuote

    } catch (error) {
        logger.warn('Failed to fetch Jupiter token price', {
            error: error instanceof Error ? error.message : String(error),
            tokenMint,
        })
        throw error
    }
}

// Cleanup function for tests and hot reloading
export function clearCache(): void {
    JUPITER_PRICE_CACHE.clear()
}

/**
 * Get a quote for swapping BEENZ token
 * @param {Object} params Quote parameters
 * @param {number} params.amount Amount in BEENZ (will be adjusted for 6 decimals)
 * @param {string} params.outputMint The token mint to swap to
 * @param {Omit<JupiterQuoteParams, 'inputMint' | 'amount' | 'outputMint'>} params.options Additional Jupiter quote options
 * @returns {Promise<JupiterQuoteResponse>}
 */
export async function getBeenzQuote(params: {
    amount: number,
    outputMint: string,
    options?: Omit<JupiterQuoteParams, 'inputMint' | 'amount' | 'outputMint'>
}): Promise<JupiterQuoteResponse> {
    // BEENZ has 6 decimals
    const amountWithDecimals = params.amount * Math.pow(10, 6)

    return getJupiterQuote({
        inputMint: JUPITER_TOKENS.BEENZ,
        outputMint: params.outputMint,
        amount: amountWithDecimals,
        ...params.options,
        // Set some sensible defaults for BEENZ swaps
        restrictIntermediateTokens: true, // For better liquidity paths
        slippageBps: params.options?.slippageBps ?? 100, // Default 1% slippage
    })
} 