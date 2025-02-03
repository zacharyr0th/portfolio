import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/core/logger'
import { AppError, handleApiError, type ErrorDetails } from '@/lib/utils/core/error-handling'

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

// CORS headers
const corsHeaders = {
    ...securityHeaders,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function POST(request: Request) {
    try {
        const rpcUrl = process.env.SUI_RPC_URL
        if (!rpcUrl) {
            throw new AppError('SUI_RPC_URL not configured', 'CONFIG_ERROR', 500)
        }

        const body = await request.json()
        const { method, params } = body

        if (!method) {
            throw new AppError('Method is required', 'INVALID_REQUEST', 400)
        }

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method,
                params: params || [],
            }),
        })

        if (!response.ok) {
            const details: ErrorDetails = { statusText: response.statusText }
            throw new AppError(
                `Sui RPC request failed: ${response.statusText}`,
                'RPC_ERROR',
                response.status,
                details
            )
        }

        const data = await response.json()
        
        if (data.error) {
            const details: ErrorDetails = { rpcError: data.error }
            logger.error('Sui RPC returned error', undefined, { details })
            throw new AppError(
                data.error.message || 'Unknown Sui RPC error',
                'RPC_ERROR',
                500,
                details
            )
        }

        return NextResponse.json(data, {
            headers: corsHeaders,
        })
    } catch (error) {
        const appError = handleApiError(error)
        logger.error('Error in Sui API route:', appError, { details: appError.toJSON() })
        
        return NextResponse.json(
            { error: appError.message },
            { status: appError.statusCode, headers: corsHeaders }
        )
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    })
} 