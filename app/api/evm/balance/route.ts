import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/core/logger'
import { EVM_CHAINS } from '@/lib/chains/evm/types'
import { formatUnits } from 'ethers'

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY
const SIMPLEHASH_BASE_URL = 'https://api.simplehash.com/api/v0'

const CHAIN_MAPPING: Record<string, string> = {
    'ethereum': 'ethereum',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const address = searchParams.get('address')
        const chain = searchParams.get('chain')

        if (!address?.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        }

        if (!SIMPLEHASH_API_KEY) {
            logger.error('SimpleHash API key not configured')
            throw new Error('SimpleHash API key not configured')
        }

        if (!chain) {
            return NextResponse.json({ error: 'Chain parameter required' }, { status: 400 })
        }

        const chainConfig = EVM_CHAINS[chain.toLowerCase() as keyof typeof EVM_CHAINS]
        if (!chainConfig) {
            return NextResponse.json({ error: 'Invalid chain' }, { status: 400 })
        }

        const simpleHashChain = CHAIN_MAPPING[chain.toLowerCase()]
        if (!simpleHashChain) {
            return NextResponse.json({ error: 'Chain not supported' }, { status: 400 })
        }

        const headers = {
            'Accept': 'application/json',
            'X-API-KEY': SIMPLEHASH_API_KEY,
        }

        // Fetch native and fungible token balances
        const [nativeRes, fungibleRes] = await Promise.all([
            fetch(`${SIMPLEHASH_BASE_URL}/native_tokens/balances?chains=${simpleHashChain}&wallet_addresses=${address}&include_prices=1`, {
                headers,
                next: { revalidate: 60 }
            }),
            fetch(`${SIMPLEHASH_BASE_URL}/fungibles/balances?chains=${simpleHashChain}&wallet_addresses=${address}&include_fungible_details=1&include_prices=1&limit=50`, {
                headers,
                next: { revalidate: 60 }
            })
        ])

        if (!nativeRes.ok || !fungibleRes.ok) {
            throw new Error('Failed to fetch balances')
        }

        const [nativeData, fungibleData] = await Promise.all([
            nativeRes.json(),
            fungibleRes.json()
        ])

        const balances = []
        const prices: Record<string, { price: number; timestamp: number }> = {}

        // Process native token
        if (nativeData.native_tokens) {
            for (const token of nativeData.native_tokens) {
                if (token.total_quantity_string && token.total_quantity_string !== '0') {
                    const uiAmount = Number(formatUnits(token.total_quantity_string, chainConfig.nativeCurrency.decimals))
                    
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
                }
            }
        }

        // Process fungible tokens
        if (fungibleData.items) {
            for (const item of fungibleData.items) {
                if (item.total_quantity_string && item.total_quantity_string !== '0' && item.fungible_details) {
                    const decimals = item.fungible_details.decimals || 18
                    const uiAmount = Number(formatUnits(item.total_quantity_string, decimals))
                    const symbol = item.fungible_details.symbol || 'Unknown'

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
                }
            }
        }

        return NextResponse.json({ balances, prices })
    } catch (error) {
        logger.error('Error fetching EVM balances:', error instanceof Error ? error : new Error(String(error)))
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
} 