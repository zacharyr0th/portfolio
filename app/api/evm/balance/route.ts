import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/core/logger'
import { EVM_CHAINS } from '@/lib/chains/evm/types'
import { ethers } from 'ethers'

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
}

// SimpleHash API configuration
const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY
const SIMPLEHASH_BASE_URL = 'https://api.simplehash.com/api/v0'

// Chain mapping for SimpleHash
const CHAIN_MAPPING: Record<string, string> = {
    'ethereum': 'ethereum',
    'eth-main': 'ethereum',
    'polygon': 'polygon',
    'polygon-main': 'polygon',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
}

export async function GET(request: Request) {
    try {
        // Parse URL parameters
        const { searchParams } = new URL(request.url)
        const address = searchParams.get('address')
        const chain = searchParams.get('chain')

        // Validate parameters
        if (!address?.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json(
                { error: 'Invalid address format' },
                { status: 400, headers: securityHeaders }
            )
        }

        if (!SIMPLEHASH_API_KEY) {
            logger.error('SimpleHash API key not configured')
            throw new Error('SimpleHash API key not configured')
        }

        // Get chain config
        const chainName = chain?.toLowerCase() || ''
        const chainConfig = chainName ? EVM_CHAINS[chainName as keyof typeof EVM_CHAINS] : null
        if (!chainConfig) {
            return NextResponse.json(
                { error: 'Invalid chain' },
                { status: 400, headers: securityHeaders }
            )
        }

        // Get SimpleHash chain name
        const simpleHashChain = CHAIN_MAPPING[chainName as keyof typeof CHAIN_MAPPING]
        if (!simpleHashChain) {
            return NextResponse.json(
                { error: 'Chain not supported by SimpleHash' },
                { status: 400, headers: securityHeaders }
            )
        }

        // First get native token balance
        const nativeUrl = `${SIMPLEHASH_BASE_URL}/native_tokens/balances?chains=${simpleHashChain}&wallet_addresses=${address}&include_prices=1`
        logger.debug('SimpleHash Native Token API request:', {
            url: nativeUrl,
            chain: simpleHashChain,
            address
        })

        // Fetch native token balance from SimpleHash
        const nativeResponse = await fetch(nativeUrl, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': SIMPLEHASH_API_KEY,
            },
            next: { revalidate: 60 } // Cache for 1 minute
        })

        if (!nativeResponse.ok) {
            const errorText = await nativeResponse.text()
            logger.error(`SimpleHash Native Token API error for ${nativeUrl}: ${errorText}`)
            throw new Error(`SimpleHash API error: ${nativeResponse.status} - ${errorText}`)
        }

        const nativeData = await nativeResponse.json()

        // Then get fungible token balances
        const fungibleUrl = `${SIMPLEHASH_BASE_URL}/fungibles/balances?chains=${simpleHashChain}&wallet_addresses=${address}&include_fungible_details=1&include_prices=1&count=0&limit=50&order_by=last_transferred_date__desc&include_native_tokens=0`
        logger.debug('SimpleHash Fungible Token API request:', {
            url: fungibleUrl,
            chain: simpleHashChain,
            address
        })

        // Fetch fungible token balances from SimpleHash
        const fungibleResponse = await fetch(fungibleUrl, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': SIMPLEHASH_API_KEY,
            },
            next: { revalidate: 60 } // Cache for 1 minute
        })

        if (!fungibleResponse.ok) {
            const errorText = await fungibleResponse.text()
            logger.error(`SimpleHash Fungible Token API error for ${fungibleUrl}: ${errorText}`)
            throw new Error(`SimpleHash API error: ${fungibleResponse.status} - ${errorText}`)
        }

        const fungibleData = await fungibleResponse.json()

        const balances = []
        const prices: Record<string, { price: number; timestamp: number }> = {}

        // Process native token balance
        if (nativeData.native_tokens) {
            for (const token of nativeData.native_tokens) {
                if (token.total_quantity_string && token.total_quantity_string !== '0') {
                    try {
                        const uiAmount = Number(ethers.utils.formatUnits(token.total_quantity_string, chainConfig.nativeCurrency.decimals))
                        
                        // Store price data if available
                        if (token.total_value_usd_cents) {
                            prices[chainConfig.nativeCurrency.symbol] = {
                                price: token.total_value_usd_cents / 100,
                                timestamp: Date.now()
                            }
                        }

                        balances.push({
                            token: {
                                symbol: chainConfig.nativeCurrency.symbol,
                                name: chainConfig.nativeCurrency.name,
                                decimals: chainConfig.nativeCurrency.decimals,
                                chainId: chainConfig.chainId,
                                verified: true,
                                address: '0x0000000000000000000000000000000000000000'
                            },
                            balance: token.total_quantity_string,
                            uiAmount
                        })
                    } catch (error) {
                        logger.warn('Error processing native token balance', {
                            error: error instanceof Error ? error.message : String(error),
                            token: token.total_quantity_string
                        })
                    }
                }
            }
        }

        // Process fungible token balances
        if (fungibleData.items) {
            for (const item of fungibleData.items) {
                if (item.total_quantity_string && item.total_quantity_string !== '0' && item.fungible_details) {
                    try {
                        const decimals = item.fungible_details.decimals || 18
                        const uiAmount = Number(ethers.utils.formatUnits(item.total_quantity_string, decimals))
                        const symbol = item.fungible_details.symbol || 'Unknown'

                        // Store price data if available
                        if (item.total_value_usd_cents) {
                            prices[symbol] = {
                                price: item.total_value_usd_cents / 100,
                                timestamp: Date.now()
                            }
                        }

                        balances.push({
                            token: {
                                symbol,
                                name: item.fungible_details.name || 'Unknown Token',
                                decimals,
                                chainId: chainConfig.chainId,
                                verified: true,
                                address: item.fungible_details.fungible_id.split('.')[1]
                            },
                            balance: item.total_quantity_string,
                            uiAmount
                        })
                    } catch (error) {
                        logger.warn('Error processing fungible token balance', {
                            error: error instanceof Error ? error.message : String(error),
                            token: item.total_quantity_string
                        })
                    }
                }
            }
        }

        return NextResponse.json(
            { balances, prices },
            { status: 200, headers: securityHeaders }
        )
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error('Error fetching EVM balances:', error instanceof Error ? error : new Error(errorMessage))
        
        return NextResponse.json(
            { error: errorMessage },
            { status: 500, headers: securityHeaders }
        )
    }
} 