import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/core/logger'
import { AppError } from '@/lib/utils/core/error-handling'

// Add logger interface extension
declare module '@/lib/utils/core/logger' {
    interface Logger {
        error(message: string, metadata?: ErrorMetadata): void;
        warn(message: string, metadata?: ErrorMetadata): void;
        info(message: string, metadata?: ErrorMetadata): void;
        debug(message: string, metadata?: ErrorMetadata): void;
    }
}

const API_URL = 'https://api.gemini.com'

// Rate limiting
const RATE_LIMIT = {
    MAX_REQUESTS: 15,
    WINDOW_MS: 60000, // 1 minute
}

const requestLog: number[] = []

type ErrorMetadata = {
    message?: string;
    error?: unknown;
    requestId?: string;
    status?: number;
    endpoint?: string;
    timestamp?: string;
}

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

let lastNonce = 0;

function getMessageSignature(
    path: string,
    extraParams: Record<string, any> = {}
): {
    signature: string
    encodedPayload: string
    payload: Record<string, any>
} {
    if (!process.env.GEMINI_API_SECRET) {
        throw new AppError('Gemini API secret not configured', 'CONFIG_ERROR', 500)
    }

    // Create the base payload with an always-increasing nonce
    const currentNonce = Date.now();
    lastNonce = currentNonce > lastNonce ? currentNonce : lastNonce + 1;
    
    const payload = {
        request: path,
        nonce: lastNonce,
        ...extraParams,
    }

    // Base64 encode the JSON payload
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')

    // Create the signature using the raw API secret
    const signature = crypto
        .createHmac('sha384', process.env.GEMINI_API_SECRET)
        .update(encodedPayload)
        .digest('hex')

    return { signature, encodedPayload, payload }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    })
}

class GeminiApiError extends Error {
    constructor(
        message: string,
        public metadata?: {
            requestId?: string;
            status?: number;
            endpoint?: string;
            timestamp?: string;
        }
    ) {
        super(message);
        this.name = 'GeminiApiError';
    }
}

export async function POST(request: Request) {
    const requestId = crypto.randomBytes(32).toString('base64')
    let body: any

    try {
        // Check rate limit
        if (isRateLimited()) {
            logger.warn(`Rate limit exceeded for request ${requestId}`)
            return NextResponse.json(
                { error: 'Too many requests' },
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        'X-Request-ID': requestId,
                        'Retry-After': '60',
                    },
                }
            )
        }

        // Log request
        requestLog.push(Date.now())

        if (!process.env.GEMINI_API_KEY) {
            throw new AppError('Gemini API key not configured', 'CONFIG_ERROR', 500)
        }

        // Parse request body with error handling
        try {
            body = await request.json()
        } catch (error) {
            logger.error(`Invalid request body: ${error instanceof Error ? error.message : String(error)}`)
            return NextResponse.json(
                { error: 'Invalid request body' },
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        'X-Request-ID': requestId,
                    },
                }
            )
        }

        const endpoint = body.endpoint || '/v1/balances'
        let account: string | undefined

        // For master API keys, first get the account list
        if (process.env.GEMINI_API_KEY.startsWith('master-')) {
            // Only fetch account list if we haven't already
            if (!endpoint.includes('account/list')) {
                const { signature: listSignature, encodedPayload: listPayload } =
                    getMessageSignature('/v1/account/list')

                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 30000)

                try {
                    const accountListResponse = await fetch(`${API_URL}/v1/account/list`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'text/plain',
                            'Content-Length': '0',
                            'X-GEMINI-APIKEY': process.env.GEMINI_API_KEY,
                            'X-GEMINI-PAYLOAD': listPayload,
                            'X-GEMINI-SIGNATURE': listSignature,
                            'Cache-Control': 'no-cache',
                        },
                        signal: controller.signal,
                    })

                    clearTimeout(timeout)

                    if (!accountListResponse.ok) {
                        const errorText = await accountListResponse.text()
                        logger.error(`Failed to get account list: ${errorText} (status: ${accountListResponse.status}, requestId: ${requestId})`)
                        throw new Error(`Failed to get account list: ${errorText}`)
                    }

                    const accountList = await accountListResponse.json()

                    // If we get a valid account list, use the first account
                    if (Array.isArray(accountList) && accountList.length > 0) {
                        account = accountList[0].account || accountList[0].name
                    }
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        logger.error(`Account list request timeout (requestId: ${requestId})`)
                        throw new Error('Request timeout')
                    }
                    throw error
                } finally {
                    clearTimeout(timeout)
                }
            }
        }

        // Prepare the payload with or without account
        const extraParams = account ? { account } : {}
        const { signature, encodedPayload } = getMessageSignature(endpoint, extraParams)

        logger.debug(`Fetching from Gemini API: ${endpoint} (requestId: ${requestId})`)

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Length': '0',
                    'X-GEMINI-APIKEY': process.env.GEMINI_API_KEY,
                    'X-GEMINI-PAYLOAD': encodedPayload,
                    'X-GEMINI-SIGNATURE': signature,
                    'Cache-Control': 'no-cache',
                },
                signal: controller.signal,
            })

            clearTimeout(timeout)

            // Try to get response as text first
            const responseText = await response.text()
            let data
            try {
                data = JSON.parse(responseText)
            } catch (e) {
                data = { error: responseText }
            }

            if (!response.ok || data.error) {
                const errorMessage = data.message || data.error || responseText
                logger.error(`Gemini API error: ${errorMessage} (status: ${response.status}, requestId: ${requestId}, endpoint: ${endpoint})`)

                return NextResponse.json(
                    { error: errorMessage || 'Failed to fetch from Gemini API' },
                    {
                        status: response.status || 400,
                        headers: {
                            ...corsHeaders,
                            'X-Request-ID': requestId,
                        },
                    }
                )
            }

            logger.debug(`Gemini API response received (requestId: ${requestId})`)

            return NextResponse.json(data, {
                headers: {
                    ...corsHeaders,
                    'X-Request-ID': requestId,
                },
            })
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                logger.error(`Gemini API request timeout (requestId: ${requestId}, endpoint: ${endpoint})`)
                return NextResponse.json(
                    { error: 'Request timeout' },
                    {
                        status: 504,
                        headers: {
                            ...corsHeaders,
                            'X-Request-ID': requestId,
                        },
                    }
                )
            }
            throw error
        } finally {
            clearTimeout(timeout)
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Error proxying Gemini request: ${errorMessage} (requestId: ${requestId}, endpoint: ${body?.endpoint})`)

        if (error instanceof AppError) {
            return NextResponse.json(
                { error: error.message },
                {
                    status: error.statusCode,
                    headers: {
                        ...corsHeaders,
                        'X-Request-ID': requestId,
                    },
                }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'X-Request-ID': requestId,
                },
            }
        )
    }
}
