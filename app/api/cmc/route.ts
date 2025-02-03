import { NextResponse } from 'next/server'
import axios from 'axios'
import { logger } from '@/lib/utils/core/logger'
import { AppError } from '@/lib/utils/core/error-handling'
import { createCache } from '@/lib/utils/core/performance'
import { z } from 'zod'
import crypto from 'crypto'

// Security utilities
const SecurityUtils = {
    generateNonce: () => crypto.randomBytes(32).toString('base64'),
}

// Security headers
const securityHeaders = {
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https: wss:",
        "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

// Validation schemas
const priceRequestSchema = z
    .object({
        symbol: z
            .string()
            .nullable()
            .transform(str => str?.split(',').filter(Boolean) || []),
        convert: z.string().nullable().default('USD'),
    })
    .transform(data => ({
        symbol: data.symbol,
        convert: data.convert,
    }))

// Types
interface TokenPrice {
    symbol: string
    price: number
    last_updated: string
    percent_change_24h: number
}

interface CMCQuote {
    price: number
    last_updated: string
    percent_change_24h: number
}

interface CMCData {
    quote: {
        USD: CMCQuote
    }
}

interface CMCResponse {
    data: {
        [symbol: string]: [CMCData]
    }
}

// Mark route as dynamic
export const dynamic = 'force-dynamic'
export const revalidate = 0

const CMC_API_KEY = process.env.CMC_API_KEY
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'

// Initialize cache with 10MB limit and 1-minute TTL
const priceCache = createCache({
    maxSize: 10 * 1024 * 1024,
    maxItems: 1000,
    namespace: 'prices',
})

// CORS options
const corsHeaders = {
    ...securityHeaders,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// OPTIONS handler for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    })
}

export async function GET(request: Request) {
    try {
        const requestId = SecurityUtils.generateNonce()
        const searchParams = new URL(request.url).searchParams

        // Validate request parameters
        const { symbol: symbols, convert } = await priceRequestSchema.parseAsync({
            symbol: searchParams.get('symbol'),
            convert: searchParams.get('convert'),
        })

        if (!symbols?.length) {
            throw new AppError('No symbols provided', 'VALIDATION_ERROR', 400)
        }

        if (!CMC_API_KEY) {
            throw new AppError('CMC API key not configured', 'CONFIG_ERROR', 500)
        }

        // Check cache first
        const cacheKey = `${symbols.join(',')}-${convert}`
        const cachedData = priceCache.get(cacheKey)
        if (cachedData) {
            return NextResponse.json(cachedData, {
                headers: {
                    ...corsHeaders,
                    'X-Request-ID': requestId,
                    'X-Cache': 'HIT',
                },
            })
        }

        // Make API request
        const maxRetries = 3
        let lastError

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios.get<CMCResponse>(CMC_BASE_URL, {
                    params: {
                        symbol: symbols.join(','),
                        convert,
                    },
                    headers: {
                        'X-CMC_PRO_API_KEY': CMC_API_KEY,
                        Accept: 'application/json',
                    },
                    timeout: 15000, // 15 second timeout
                })

                if (!response.data?.data) {
                    throw new AppError('Invalid response from CMC API', 'API_ERROR', 500)
                }

                // Process the data into a more efficient format
                const processedData: Record<string, TokenPrice> = {}
                for (const [symbol, data] of Object.entries(response.data.data)) {
                    if (data?.[0]?.quote?.USD) {
                        const quote = data[0].quote.USD
                        processedData[symbol] = {
                            symbol,
                            price: quote.price || 0,
                            last_updated: quote.last_updated,
                            percent_change_24h: quote.percent_change_24h || 0,
                        }
                    }
                }

                // Cache the processed data
                priceCache.set(cacheKey, processedData)

                return NextResponse.json(processedData, {
                    headers: {
                        ...corsHeaders,
                        'X-Request-ID': requestId,
                        'X-Cache': 'MISS',
                        'X-Retry-Attempt': attempt.toString(),
                    },
                })
            } catch (error) {
                lastError = error
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
                    continue
                }
            }
        }

        throw lastError // If all retries failed, throw the last error
    } catch (error) {
        logger.error('Price API error', error instanceof Error ? error : new Error('Unknown error'))

        const errorMessage = error instanceof AppError ? error.message : 'ERR'
        const statusCode = error instanceof AppError ? error.statusCode : 500

        return NextResponse.json(
            { error: errorMessage },
            {
                status: statusCode,
                headers: {
                    ...corsHeaders,
                    'X-Request-ID': SecurityUtils.generateNonce(),
                    'X-Error': 'true',
                },
            }
        )
    }
}
