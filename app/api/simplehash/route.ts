import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchWalletNFTs, fetchNFTMetadata } from '@/lib/data/simplehash'

// Constants
const DEFAULT_ORIGIN = '*'
const MAX_CACHE_AGE = 60 * 5 // 5 minutes

// Security headers with CORS configuration
const SECURITY_HEADERS = {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Access-Control-Allow-Origin': DEFAULT_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': `public, max-age=${MAX_CACHE_AGE}`,
} as const

// Validation schemas
const walletNFTsSchema = z.object({
    wallet: z.string().regex(/^(0x[a-fA-F0-9]{40}|0x[a-fA-F0-9]{64}|[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32,44})$/),
    chain: z.string(),
})

const nftMetadataSchema = z.object({
    contract: z.string(),
    tokenId: z.string(),
    chain: z.string(),
})

// Route configuration
export const dynamic = 'force-dynamic'
export const revalidate = 0

// CORS preflight handler
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS })
}

// Error response helper
const createErrorResponse = (message: string, status: number = 400) => {
    return NextResponse.json(
        { error: message },
        { status, headers: SECURITY_HEADERS }
    )
}

// Success response helper
const createSuccessResponse = (data: unknown) => {
    return NextResponse.json(data, { headers: SECURITY_HEADERS })
}

// GET handler
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const isMetadataRequest = searchParams.has('contract') && searchParams.has('tokenId')
        
        if (isMetadataRequest) {
            const result = nftMetadataSchema.safeParse({
                contract: searchParams.get('contract'),
                tokenId: searchParams.get('tokenId'),
                chain: searchParams.get('chain'),
            })

            if (!result.success) {
                return createErrorResponse('Invalid parameters', 400)
            }

            const { contract, tokenId, chain } = result.data
            const metadata = await fetchNFTMetadata(contract, tokenId, chain)
            return createSuccessResponse(metadata)
        } 

        const result = walletNFTsSchema.safeParse({
            wallet: searchParams.get('wallet'),
            chain: searchParams.get('chain'),
        })

        if (!result.success) {
            return createErrorResponse('Invalid wallet address or chain', 400)
        }

        const { wallet, chain } = result.data
        const nfts = await fetchWalletNFTs(wallet, chain)
        return createSuccessResponse(nfts)
    } catch (error) {
        console.error('SimpleHash API Error:', error)
        const message = error instanceof Error ? error.message : 'Internal server error'
        return createErrorResponse(message, 500)
    }
} 