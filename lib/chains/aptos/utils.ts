import type { TokenBalance } from './types'
import { logger } from '@/lib/utils/core/logger'
import { TOKEN_SYMBOL_MAP, RPC_ENDPOINTS } from './constants'
import { chainInfo } from '../config'

// Get RPC URL with fallback mechanism
async function getWorkingRpcUrl(): Promise<string> {
    // Try configured RPC first
    const configuredRpc = chainInfo.aptos.rpcEndpoint
    if (configuredRpc) {
        try {
            // Use root endpoint for health check
            const response = await fetch(`${configuredRpc}`)
            if (response.ok) {
                return configuredRpc
            }
        } catch (err) {
            logger.warn(`Configured RPC ${configuredRpc} is not responding, trying fallbacks`)
        }
    }

    // Try fallback RPCs
    for (const rpc of RPC_ENDPOINTS) {
        try {
            // Use root endpoint for health check
            const response = await fetch(`${rpc}`)
            if (response.ok) {
                return rpc
            }
        } catch (err) {
            logger.warn(`Fallback RPC ${rpc} is not responding`)
        }
    }

    throw new Error('No working RPC endpoint found')
}

// Known token decimals
const TOKEN_DECIMALS: Record<string, number> = {
    APT: 8,
    USDC: 6,
    USDT: 6,
    WETH: 8,
    WBTC: 8,
}

// Update the RPC request function
async function makeRpcRequest<T>(endpoint: string, params: any = {}): Promise<T> {
    const response = await fetch('/api/aptos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, params }),
    })

    if (!response.ok) {
        throw new Error(`Aptos API error: ${response.status}`)
    }

    const data = await response.json()
    if (data.error) {
        throw new Error(`Aptos RPC error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    return data
}

interface AptosResource {
    type: string
    data: {
        coin?: {
            value: string
        }
    }
}

export async function fetchAptosAccountResources(
    publicKey: string
): Promise<{ balances: TokenBalance[] }> {
    try {
        const resources = await makeRpcRequest<AptosResource[]>(`/accounts/${publicKey}/resources`)
        const balances: TokenBalance[] = []

        // Process resources to extract token balances
        for (const resource of resources) {
            try {
                if (resource.type.includes('0x1::coin::CoinStore')) {
                    const tokenType = resource.type.match(/0x1::coin::CoinStore<(.+)>/)?.[1]
                    if (!tokenType) continue

                    // Get token info from symbol map
                    const tokenInfo = Object.entries(TOKEN_SYMBOL_MAP).find(
                        ([type]) => type === tokenType || tokenType.includes(type)
                    )?.[1]

                    if (!tokenInfo) continue

                    const amount = resource.data.coin?.value
                    if (!amount || isNaN(Number(amount))) continue

                    balances.push({
                        token: {
                            symbol: tokenInfo.symbol,
                            name: tokenInfo.name,
                            decimals: tokenInfo.decimals,
                            tokenAddress: tokenType,
                        },
                        balance: amount,
                    })
                }
            } catch (err) {
                logger.warn(
                    `Error processing resource: ${err instanceof Error ? err.message : 'Unknown error'}`
                )
            }
        }

        // Add STAPT balance if present
        const staptValue = getStaptValue(resources)
        if (staptValue > 0) {
            balances.push({
                token: {
                    symbol: 'STAPT',
                    name: 'Staked Aptos',
                    decimals: TOKEN_DECIMALS['STAPT'] || 8,
                    tokenAddress:
                        '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt',
                },
                balance: staptValue.toString(),
            })
        }

        return { balances }
    } catch (error) {
        logger.error(
            `Error fetching Aptos resources: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        throw error
    }
}

// Calculate STAPT value from resources
export function getStaptValue(resources?: AptosResource[]): number {
    if (!resources?.length) return 0

    const staptResource = resources.find(
        r =>
            r.type ===
            '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt'
    )

    if (!staptResource?.data?.coin?.value) return 0

    const rawValue = Number(staptResource.data.coin.value)
    if (isNaN(rawValue) || !isFinite(rawValue)) return 0

    // Use the known decimal value from TOKEN_DECIMALS constant
    const decimals = TOKEN_DECIMALS['STAPT'] || 8 // Default to 8 if not found
    return rawValue / Math.pow(10, decimals)
}
