import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/core/logger'
import { AppError } from '@/lib/utils/core/error-handling'

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
        const body = await request.json()
        const { endpoint } = body

        if (!endpoint) {
            throw new Error('No endpoint specified')
        }

        // Use the public RPC URL from environment
        const rpcUrl = process.env.APTOS_RPC_URL || 'https://fullnode.mainnet.aptoslabs.com/v1'
        const response = await fetch(`${rpcUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        })

        if (!response.ok) {
            if (response.status === 429) {
                return NextResponse.json(
                    { error: 'Rate limit exceeded' },
                    { status: 429, headers: { ...corsHeaders, 'Retry-After': '2' } }
                )
            }
            throw new Error(`Aptos API error: ${response.status}`)
        }

        const data = await response.json()
        return NextResponse.json(data, { headers: corsHeaders })
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred')
        logger.error('Error in Aptos API route:', err)
        return NextResponse.json(
            { error: err.message },
            { status: 500, headers: corsHeaders }
        )
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    })
} 
