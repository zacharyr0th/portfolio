import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/core/logger'
import { AppError } from '@/lib/utils/core/error-handling'
import crypto from 'crypto'

// Security headers for development
const securityHeaders: Record<string, string | string[]> = process.env.NODE_ENV === 'development' 
    ? {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
    : {
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
const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Helper to create wallet config
const createWalletConfig = (
    id: string,
    name: string,
    chain: string,
    publicKey: string
) => ({
    id,
    name,
    type: 'wallet',
    chain,
    status: 'active',
    publicKey,
    value: 0,
    lastUpdated: new Date().toISOString(),
})

// Function to dynamically generate wallet configurations from environment variables
function generateWalletConfigs() {
    const walletConfigs = {
        solana: {} as Record<string, any>,
        aptos: {} as Record<string, any>,
        sui: {} as Record<string, any>,
    }

    // Get all environment variables
    const envVars = process.env || {}
    
    // Debug log all environment variables
    logger.debug('All environment variables:', {
        all: Object.keys(envVars),
        wallet: Object.keys(envVars).filter(key => key.includes('WALLET')),
        solana: Object.keys(envVars).filter(key => key.startsWith('SOLANA_WALLET')),
        aptos: Object.keys(envVars).filter(key => key.startsWith('APTOS_WALLET')),
        sui: Object.keys(envVars).filter(key => key.startsWith('SUI_WALLET')),
    })

    // Process each environment variable for wallets
    Object.entries(envVars).forEach(([key, value]) => {
        logger.debug(`Processing env var: ${key}=${value}`)

        if (!value || value === 'your_solana_wallet_address' || 
            value === 'your_aptos_wallet_address' || 
            value === 'your_sui_wallet_address') {
            logger.debug(`Skipping placeholder wallet value for ${key}`)
            return
        }

        // Match wallet public keys by prefix
        const solanaMatch = key.match(/^SOLANA_WALLET_(.+)$/)
        if (solanaMatch) {
            logger.debug(`Found Solana wallet match:`, { key, match: solanaMatch[1] })
        }
        const aptosMatch = key.match(/^APTOS_WALLET_(.+)$/)
        const suiMatch = key.match(/^SUI_WALLET_(.+)$/)

        try {
            if (solanaMatch?.[1]) {
                const name = solanaMatch[1] // Use the exact name from env var
                const id = `sol-${name.toLowerCase()}`
                walletConfigs.solana[id] = createWalletConfig(id, name, 'solana', value)
                logger.debug(`Created Solana wallet config:`, { id, name, publicKey: value })
            }
            else if (aptosMatch?.[1]) {
                const name = aptosMatch[1]
                const id = `apt-${name.toLowerCase()}`
                walletConfigs.aptos[id] = createWalletConfig(id, name, 'aptos', value)
                logger.debug(`Created Aptos wallet config:`, { id, name, publicKey: value })
            }
            else if (suiMatch?.[1]) {
                const name = suiMatch[1]
                const id = `sui-${name.toLowerCase()}`
                walletConfigs.sui[id] = createWalletConfig(id, name, 'sui', value)
                logger.debug(`Created Sui wallet config:`, { id, name, publicKey: value })
            }
        } catch (error) {
            logger.error(`Error creating wallet config for ${key}:`, error instanceof Error ? error : new Error(String(error)))
        }
    })

    // Log final configurations
    logger.debug('Generated wallet configurations:', {
        solanaCount: Object.keys(walletConfigs.solana).length,
        aptosCount: Object.keys(walletConfigs.aptos).length,
        suiCount: Object.keys(walletConfigs.sui).length,
        solanaKeys: Object.keys(walletConfigs.solana),
    })

    return walletConfigs
}

// Get account configurations
export async function GET() {
    const requestId = crypto.randomBytes(32).toString('base64')
    
    try {
        // Generate wallet configurations dynamically
        const walletConfigs = generateWalletConfigs()

        // Log the generated configurations for debugging
        logger.debug('Generated wallet configurations:', { 
            requestId,
            walletCount: {
                solana: Object.keys(walletConfigs.solana).length,
                aptos: Object.keys(walletConfigs.aptos).length,
                sui: Object.keys(walletConfigs.sui).length
            },
            solanaWallets: Object.values(walletConfigs.solana).map(w => w.publicKey)
        })

        // Return the configurations
        return NextResponse.json(
            walletConfigs,
            {
                status: 200,
                headers: new Headers({
                    ...corsHeaders,
                    'X-Request-ID': requestId,
                }),
            }
        )
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred')
        logger.error('Error fetching account configurations', err, { requestId })
        
        return NextResponse.json(
            { error: err.message },
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

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
    return NextResponse.json(
        {},
        {
            status: 200,
            headers: new Headers(corsHeaders),
        }
    )
} 