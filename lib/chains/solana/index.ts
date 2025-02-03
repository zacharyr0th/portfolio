import { chainInfo } from '../config'
import { fetchTokenPrices } from '@/lib/data/cmc'
import type { TokenBalance, TokenPrice, SolanaAccountInfo, TokenAccount } from './types'
import type { ChainHandler } from '../types'
import { BaseChainHandler } from '../baseHandler'
import { logger } from '@/lib/utils/core/logger'
import { SolanaTokenBalance } from './TokenBalance'
import {
    TOKEN_SYMBOL_MAP,
    DEFAULT_PRICE,
    TOKEN_PROGRAM_ID,
    NATIVE_SOL_MINT,
} from './constants'
import { getJupiterQuote, getJupiterTokenPrice } from './jupiter'

// Helper function to make RPC requests with retries
async function makeRpcRequest<T>(method: string, params: any[]): Promise<T> {
    const maxRetries = 3
    const retryDelay = 2000 // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('/api/solana', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, params }),
            })

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After')
                await new Promise(resolve => 
                    setTimeout(resolve, retryAfter ? parseInt(retryAfter) * 1000 : retryDelay)
                )
                continue
            }

            if (!response.ok) {
                logger.warn(`Solana RPC request failed`, {
                    status: response.status,
                    method,
                    attempt
                })
                throw new Error(`Solana API error: ${response.status}`)
            }

            const data = await response.json()
            if (data.error) {
                logger.warn(`Solana RPC response error`, {
                    error: data.error,
                    method,
                    attempt
                })
                throw new Error(`Solana RPC error: ${data.error.message || JSON.stringify(data.error)}`)
            }

            return data.result as T
        } catch (error) {
            if (attempt === maxRetries) {
                logger.error(`Solana RPC request failed after ${maxRetries} attempts`, 
                    error instanceof Error ? error : new Error(String(error)), 
                    { method }
                )
                throw error
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
    }

    throw new Error('Max retries exceeded')
}

// Helper function to get BEENZ price from Jupiter
async function getBeenzPrice(): Promise<number> {
    try {
        // Get quote for 1 BEENZ to USDC
        const quote = await getJupiterQuote({
            inputMint: '9sbrLLnk4vxJajnZWXP9h5qk1NDFw7dz2eHjgemcpump', // BEENZ
            outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            amount: 1000000, // 1 BEENZ (6 decimals)
            slippageBps: 100,
        })
        
        // Calculate price in USD (USDC)
        const outAmount = Number(quote.outAmount) / Math.pow(10, 6) // USDC has 6 decimals
        const inAmount = Number(quote.inAmount) / Math.pow(10, 6) // BEENZ has 6 decimals
        return outAmount / inAmount
    } catch (error) {
        logger.warn('Failed to fetch BEENZ price from Jupiter', {
            error: error instanceof Error ? error.message : String(error)
        })
        return 0
    }
}

// Create Solana handler instance
const solanaHandlerInstance = new BaseChainHandler({
    chainName: 'solana',
    async fetchBalancesImpl(publicKey: string) {
        if (!publicKey?.trim()) {
            logger.warn('No public key provided for Solana balance fetch')
            return { balances: [] }
        }

        try {
            logger.debug(`Fetching balances for Solana address: ${publicKey}`)

            // Fetch SOL balance
            const accountInfo = await makeRpcRequest<{ value: SolanaAccountInfo | null }>('getAccountInfo', [
                publicKey,
                { encoding: 'jsonParsed', commitment: 'confirmed' },
            ])

            // Fetch token accounts
            const tokenAccounts = await makeRpcRequest<{ value: TokenAccount[] }>('getTokenAccountsByOwner', [
                publicKey,
                { programId: TOKEN_PROGRAM_ID },
                { encoding: 'jsonParsed', commitment: 'confirmed' },
            ])

            const balances: TokenBalance[] = []

            // Add SOL balance
            if (accountInfo?.value) {
                const lamports = accountInfo.value.lamports
                // Only add SOL balance if it's greater than 0.000001 SOL (dust threshold)
                if (lamports > 1000) {
                    balances.push({
                        token: {
                            symbol: 'SOL',
                            name: 'Solana',
                            decimals: 9,
                            tokenAddress: NATIVE_SOL_MINT,
                        },
                        balance: lamports.toString(),
                    })
                }
            }

            // Add token balances
            if (tokenAccounts?.value) {
                for (const account of tokenAccounts.value) {
                    try {
                        const { parsed } = account.account.data
                        if (parsed.type !== 'account') continue

                        const { info } = parsed
                        const { mint, tokenAmount } = info
                        const tokenInfo = TOKEN_SYMBOL_MAP[mint] || {
                            symbol: mint.slice(0, 6) + '...',
                            name: 'Unknown Token',
                            decimals: tokenAmount.decimals
                        }

                        const amount = parseFloat(tokenAmount.amount)
                        // Filter out dust amounts based on token
                        const minAmount = tokenInfo.symbol === 'USDC' || tokenInfo.symbol === 'USDT'
                            ? Math.pow(10, tokenInfo.decimals - 2) // $0.01 for stablecoins
                            : Math.pow(10, tokenInfo.decimals - 6) // 0.000001 for other tokens

                        if (amount > minAmount) {
                            balances.push({
                                token: {
                                    ...tokenInfo,
                                    tokenAddress: mint,
                                },
                                balance: tokenAmount.amount,
                            })
                        }
                    } catch (err) {
                        logger.warn('Error processing token account', {
                            error: err instanceof Error ? err.message : String(err)
                        })
                        continue
                    }
                }
            }

            // Sort balances by value (if prices are available)
            return { balances }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            logger.error('Error fetching Solana balances', err)
            throw error
        }
    },
    async fetchPricesImpl() {
        try {
            // Get all unique token symbols
            const tokenSymbols = Object.values(TOKEN_SYMBOL_MAP).map(t => t.symbol)
            const uniqueSymbols = Array.from(new Set(tokenSymbols))

            // Fetch prices from CMC
            const prices = await fetchTokenPrices(uniqueSymbols)
            const tokenPrices: Record<string, TokenPrice> = {}

            // Process each token's price
            for (const symbol of uniqueSymbols) {
                if (prices?.[symbol]) {
                    tokenPrices[symbol] = {
                        price: prices[symbol].price || 0,
                        priceChange24h: prices[symbol].percent_change_24h || 0,
                        lastUpdated: Date.now(),
                        confidence: 1
                    }
                } else {
                    // For stablecoins, use 1:1 USD price
                    if (symbol === 'USDC' || symbol === 'USDT') {
                        tokenPrices[symbol] = {
                            price: 1,
                            priceChange24h: 0,
                            lastUpdated: Date.now(),
                            confidence: 1
                        }
                    } else {
                        tokenPrices[symbol] = DEFAULT_PRICE
                    }
                }
            }

            return tokenPrices
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            logger.error('Error fetching token prices', err)
            return {}
        }
    },
    getExplorerUrlImpl: (publicKey: string) => {
        const chain = chainInfo['solana']
        return `${chain.explorer}/account/${publicKey}`
    },
    BalanceDisplayComponent: SolanaTokenBalance,
})

// Export the handler interface
export const solanaHandler: ChainHandler = solanaHandlerInstance

// Export cleanup function for tests and hot reloading
export const clearCache = () => solanaHandlerInstance.clearCache() 
