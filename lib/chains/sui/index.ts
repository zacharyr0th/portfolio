import { chainInfo } from '../config'
import { fetchTokenPrices } from '@/lib/data/cmc'
import type { TokenBalance, TokenPrice, SuiBalance, SuiCoinMetadata } from './types'
import type { ChainHandler } from '../types'
import { BaseChainHandler } from '../baseHandler'
import { logger } from '@/lib/utils/core/logger'
import { SuiTokenBalance } from './TokenBalance'

// Constants for Sui chain
const HANDLER_CONSTANTS = {
    REQUEST_TIMEOUT: 30000,
    DEFAULT_COIN_TYPE: '0x2::sui::SUI',
}

// Known token mappings for Sui
const TOKEN_SYMBOL_MAP: Readonly<
    Record<string, { symbol: string; name: string; decimals: number }>
> = Object.freeze({
    '0x2::sui::SUI': { symbol: 'SUI', name: 'Sui', decimals: 9 },
    '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
    },
})

const DEFAULT_PRICE: TokenPrice = {
    price: 0,
    priceChange24h: 0,
}

// Update the RPC request function
async function makeRpcRequest<T>(method: string, params: any[]): Promise<T> {
    const response = await fetch('/api/sui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params }),
    })

    if (!response.ok) {
        throw new Error(`Sui API error: ${response.status}`)
    }

    const data = await response.json()
    if (data.error) {
        throw new Error(`Sui RPC error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    return data.result as T
}

// Helper function to fetch coin metadata
async function fetchCoinMetadata(coinType: string): Promise<SuiCoinMetadata | null> {
    try {
        const data = await makeRpcRequest<SuiCoinMetadata>('suix_getCoinMetadata', [coinType])
        return data
    } catch (error) {
        logger.error(`Error fetching coin metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return null
    }
}

// Helper function to fetch balances
async function fetchBalances(publicKey: string): Promise<SuiBalance[]> {
    const data = await makeRpcRequest<SuiBalance[]>('suix_getAllBalances', [publicKey])
    return data
}

// Create Sui handler instance
const suiHandlerInstance = new BaseChainHandler({
    chainName: 'sui',
    fetchBalancesImpl: async (publicKey: string) => {
        if (!publicKey?.trim()) {
            logger.warn('No public key provided for Sui balance fetch')
            return { balances: [] }
        }

        try {
            logger.debug(`Fetching balances for Sui address: ${publicKey}`)
            const rpcUrl = chainInfo.sui.rpcEndpoint
            if (!rpcUrl) {
                throw new Error('Sui RPC endpoint not configured')
            }
            logger.debug(`Using Sui RPC endpoint: ${rpcUrl}`)

            const requestBody = {
                jsonrpc: '2.0',
                id: 1,
                method: 'suix_getAllBalances',
                params: [publicKey],
            }
            logger.debug(`Sending Sui RPC request: ${JSON.stringify(requestBody)}`)

            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(HANDLER_CONSTANTS.REQUEST_TIMEOUT),
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch balances: ${response.status}`)
            }

            const data = await response.json()
            if (!data.result || !Array.isArray(data.result)) {
                throw new Error('Invalid response format')
            }

            logger.debug(`Parsed Sui balance data:`, data)
            const balances: SuiBalance[] = data.result

            // Process and validate each balance
            const processedBalances = await Promise.all(
                balances.map(async balance => {
                    try {
                        // Get token info from mapping or fetch metadata
                        let tokenInfo = TOKEN_SYMBOL_MAP[balance.coinType]

                        if (!tokenInfo) {
                            logger.debug(`Fetching metadata for unknown token: ${balance.coinType}`)
                            const metadata = await fetchCoinMetadata(balance.coinType)
                            if (metadata) {
                                tokenInfo = {
                                    symbol: metadata.symbol,
                                    name: metadata.name,
                                    decimals: metadata.decimals,
                                }
                            } else {
                                logger.debug(
                                    `No metadata found for token: ${balance.coinType}, using defaults`
                                )
                                tokenInfo = {
                                    symbol: balance.coinType.split('::').pop() || 'UNKNOWN',
                                    name: 'Unknown Token',
                                    decimals: 9,
                                }
                            }
                        }

                        return {
                            token: {
                                symbol: tokenInfo.symbol,
                                name: tokenInfo.name,
                                decimals: tokenInfo.decimals,
                                tokenAddress: balance.coinType,
                                chainId: 1, // Sui mainnet
                            },
                            balance: balance.totalBalance,
                        } as TokenBalance
                    } catch (err) {
                        logger.error(
                            `Error processing balance for ${balance.coinType}: ${
                                err instanceof Error ? err.message : 'Unknown error'
                            }`
                        )
                        return null
                    }
                })
            )

            // Filter out null values and sort by balance value
            const tokenBalances = processedBalances
                .filter((b): b is NonNullable<typeof b> => b !== null)
                .sort((a, b) => {
                    const aValue = Number(a.balance) / Math.pow(10, a.token.decimals)
                    const bValue = Number(b.balance) / Math.pow(10, b.token.decimals)
                    return bValue - aValue
                })

            logger.debug(`Processed ${tokenBalances.length} valid Sui balances`)
            return { balances: tokenBalances }
        } catch (error) {
            logger.error(
                `Error fetching Sui balances: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            throw error
        }
    },
    fetchPricesImpl: async () => {
        try {
            // Get all unique token symbols
            const tokenSymbols = Object.values(TOKEN_SYMBOL_MAP).map(t => t.symbol)
            const uniqueSymbols = Array.from(new Set(tokenSymbols))

            // Fetch prices from price service
            const prices = await fetchTokenPrices(uniqueSymbols).catch(err => {
                logger.error(`Failed to fetch token prices: ${err.message}`)
                return null
            })

            const tokenPrices: Record<string, TokenPrice> = {}

            // Process each token's price, using DEFAULT_PRICE if fetch failed
            for (const symbol of uniqueSymbols) {
                const price = prices?.[symbol]
                tokenPrices[symbol] = price
                    ? {
                          price: price.price,
                          priceChange24h: price.percent_change_24h || 0,
                      }
                    : DEFAULT_PRICE
            }

            return tokenPrices
        } catch (error) {
            logger.error(
                `Error fetching Sui prices: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            // Return default prices for all tokens on error
            return Object.fromEntries(
                Object.values(TOKEN_SYMBOL_MAP).map(t => [t.symbol, DEFAULT_PRICE])
            )
        }
    },
    getExplorerUrlImpl: (publicKey: string) => {
        const chain = chainInfo['sui']
        return `${chain.explorer}/address/${publicKey}`
    },
    BalanceDisplayComponent: SuiTokenBalance,
})

// Export the handler interface
export const suiHandler: ChainHandler = suiHandlerInstance

// Export cleanup function for tests and hot reloading
export const clearCache = () => suiHandlerInstance.clearCache()
