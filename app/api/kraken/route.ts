import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/core/logger'
import { AppError, handleApiError, type ErrorDetails } from '@/lib/utils/core/error-handling'

class KrakenError extends Error {
    constructor(
        message: string,
        public requestId: string,
        public endpoint?: string,
        public status?: number,
        public headers?: Record<string, string>
    ) {
        super(message);
        this.name = 'KrakenError';
    }
}

type LogErrorParams = {
    requestId: string;
    endpoint?: string;
    error: unknown;
    status?: number;
    headers?: Record<string, string>;
}

const API_URL = 'https://api.kraken.com'
const API_VERSION = '0'

// Rate limiting
const RATE_LIMIT = {
    MAX_REQUESTS: 15,
    WINDOW_MS: 60000, // 1 minute
}

const requestLog: number[] = []

function isRateLimited(): boolean {
    const now = Date.now()
    // Remove requests older than the window
    while (requestLog.length > 0 && requestLog[0] !== undefined && requestLog[0] < now - RATE_LIMIT.WINDOW_MS) {
        requestLog.shift()
    }
    return requestLog.length >= RATE_LIMIT.MAX_REQUESTS
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

// CORS options
const corsHeaders = {
    ...securityHeaders,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Add nonce tracking with microsecond precision and random component
let lastNonce = Date.now() * 1000

function generateNonce(): string {
    const timestamp = Date.now() * 1000 // Convert to microseconds
    const random = Math.floor(Math.random() * 1000) // Add random component
    // Ensure nonce is always increasing with a larger buffer
    lastNonce = Math.max(timestamp, lastNonce + 1000) + random
    return lastNonce.toString()
}

function validateApiKeys() {
    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_PRIVATE_KEY) {
        throw new AppError('Kraken API keys not configured', 'CONFIG_ERROR', 500)
    }

    if (process.env.KRAKEN_API_KEY.length < 1 || process.env.KRAKEN_API_PRIVATE_KEY.length < 1) {
        throw new AppError('Invalid Kraken API keys', 'CONFIG_ERROR', 500)
    }
}

function getMessageSignature(path: string, postData: string, nonce: string): string {
    validateApiKeys()
    
    const secret = Buffer.from(process.env.KRAKEN_API_PRIVATE_KEY!, 'base64')
    const message = Buffer.from(nonce + postData)
    const hash = crypto.createHash('sha256').update(message).digest()
    const hmac = crypto.createHmac('sha512', secret)
    hmac.update(Buffer.from(path + hash.toString('binary'), 'binary'))
    return hmac.digest('base64')
}

// OPTIONS handler for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    })
}

export async function POST(request: Request) {
    try {
        if (isRateLimited()) {
            throw new AppError('Rate limit exceeded', 'RATE_LIMIT', 429)
        }

        validateApiKeys()

        const body = await request.json()
        const { endpoint, data = {} } = body

        if (!endpoint) {
            throw new AppError('Endpoint is required', 'INVALID_REQUEST', 400)
        }

        // Add retry logic for Balance endpoint
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
            try {
                const nonce = generateNonce()
                const postData = new URLSearchParams({ ...data, nonce }).toString()
                const signature = getMessageSignature(`/${API_VERSION}/private/${endpoint}`, postData, nonce)

                const apiKey = process.env.KRAKEN_API_KEY
                if (!apiKey) {
                    throw new AppError('Kraken API key not configured', 'CONFIG_ERROR', 500)
                }

                const response = await fetch(`${API_URL}/${API_VERSION}/private/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'API-Key': apiKey,
                        'API-Sign': signature,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: postData,
                })

                if (!response.ok) {
                    const details: ErrorDetails = { statusText: response.statusText }
                    throw new AppError(
                        `Kraken API request failed: ${response.statusText}`,
                        'API_ERROR',
                        response.status,
                        details
                    )
                }

                const responseData = await response.json()

                if (responseData.error && responseData.error.length > 0) {
                    const details: ErrorDetails = {
                        endpoint,
                        errors: responseData.error
                    }
                    
                    // Check if error is retryable
                    const errorMessage = responseData.error[0].toLowerCase()
                    if (errorMessage.includes('nonce') || errorMessage.includes('timeout')) {
                        if (retries < maxRetries - 1) {
                            logger.warn(`Retrying Kraken ${endpoint} request due to error: ${errorMessage}`)
                            retries++
                            await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)))
                            continue
                        }
                    }
                    
                    logger.error('Kraken API returned error', undefined, { details })
                    throw new AppError(
                        responseData.error[0] || 'Unknown Kraken API error',
                        'API_ERROR',
                        500,
                        details
                    )
                }

                // Add request to rate limiting log
                requestLog.push(Date.now())

                return NextResponse.json(responseData, {
                    headers: corsHeaders,
                })
            } catch (error) {
                if (retries < maxRetries - 1 && error instanceof AppError && error.code === 'API_ERROR') {
                    retries++
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)))
                    continue
                }
                throw error
            }
        }
        
        throw new AppError('Max retries exceeded', 'API_ERROR', 500)
    } catch (error) {
        const appError = handleApiError(error)
        logger.error('Error in Kraken API route:', appError, { details: appError.toJSON() })
        
        return NextResponse.json(
            { error: appError.message },
            { status: appError.statusCode, headers: corsHeaders }
        )
    }
}
