import { chainInfo } from '../config'
import { fetchAptosAccountResources } from './utils'
import { fetchTokenPrices } from '@/lib/data/cmc'
import { AptosTokenBalance } from './TokenBalance'
import type { TokenBalance, TokenPrice } from './types'
import type { ChainHandler } from '../types'
import { BaseChainHandler } from '../baseHandler'
import { logger } from '@/lib/utils/core/logger'
import { TOKEN_SYMBOL_MAP, DEFAULT_PRICE, SPAM_PATTERNS } from './constants'

// Create Aptos handler instance
const aptosHandlerInstance = new BaseChainHandler({
    chainName: 'aptos',
    fetchBalancesImpl: async (publicKey: string) => {
        if (!publicKey?.trim()) {
            logger.warn('No public key provided for Aptos balance fetch')
            return { balances: [] }
        }

        try {
            logger.debug(`Fetching Aptos account resources for ${publicKey}`)
            const response = await fetchAptosAccountResources(publicKey)

            if (!response?.balances) {
                logger.error(
                    'Invalid response structure from Aptos resources - missing balances array'
                )
                throw new Error('Invalid response structure from Aptos resources')
            }

            logger.debug(`Raw balances received: ${response.balances.length}`)

            // Filter out spam tokens and validate balances
            const validBalances = response.balances.filter(balance => {
                try {
                    // Skip spam tokens
                    if (SPAM_PATTERNS.some(pattern => pattern.test(balance.token.name))) {
                        logger.debug(`Filtering out spam token: ${balance.token.name}`)
                        return false
                    }

                    const rawBalance = Number(balance.balance)
                    if (isNaN(rawBalance) || !isFinite(rawBalance)) {
                        logger.debug(
                            `Invalid balance value for token ${balance.token.symbol}: ${balance.balance}`
                        )
                        return false
                    }

                    const formattedBalance = rawBalance / Math.pow(10, balance.token.decimals)

                    // Adjust minimum balance based on token
                    let minBalance = 0.000001 // Default minimum
                    if (balance.token.symbol === 'APT' || balance.token.symbol === 'STAPT') {
                        minBalance = 0.0001 // Higher minimum for APT/STAPT due to value
                    } else if (balance.token.symbol === 'USDC' || balance.token.symbol === 'USDT') {
                        minBalance = 0.01 // $0.01 minimum for stablecoins
                    } else if (balance.token.symbol === 'WETH' || balance.token.symbol === 'WBTC') {
                        minBalance = 0.000001 // Lower minimum for high-value tokens
                    }

                    const isValid = formattedBalance >= minBalance

                    if (!isValid) {
                        logger.debug(
                            `Filtering out dust amount for ${balance.token.symbol}: ${formattedBalance}`
                        )
                    } else {
                        logger.debug(
                            `Valid balance for ${balance.token.symbol}: ${formattedBalance}`
                        )
                    }

                    return isValid
                } catch (err) {
                    logger.warn(
                        `Error processing balance: ${err instanceof Error ? err.message : 'Unknown error'}`
                    )
                    return false
                }
            })

            logger.debug(`Found ${validBalances.length} valid Aptos token balances`)
            return { balances: validBalances }
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error occurred')
            logger.error(`Error fetching Aptos balances: ${err.message}`)
            throw err
        }
    },
    fetchPricesImpl: async () => {
        try {
            // Get all unique token symbols
            const tokenSymbols = Object.values(TOKEN_SYMBOL_MAP).map(t => t.symbol)
            const uniqueSymbols = Array.from(new Set(tokenSymbols))

            // Fetch prices from price service
            const prices = await fetchTokenPrices(uniqueSymbols)
            const tokenPrices: Record<string, TokenPrice> = {}

            // Process each token's price
            for (const symbol of uniqueSymbols) {
                if (prices?.[symbol]) {
                    tokenPrices[symbol] = {
                        price: prices[symbol].price || 0,
                        priceChange24h: prices[symbol].percent_change_24h || 0,
                    }
                } else {
                    // For STAPT, use APT price
                    if (symbol === 'STAPT' && prices?.['APT']) {
                        tokenPrices[symbol] = {
                            price: prices['APT'].price || 0,
                            priceChange24h: prices['APT'].percent_change_24h || 0,
                        }
                    } else {
                        tokenPrices[symbol] = DEFAULT_PRICE
                    }
                }
            }

            return tokenPrices
        } catch (error) {
            logger.error(
                `Error fetching Aptos prices: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return {}
        }
    },
    getExplorerUrlImpl: (publicKey: string, accountId: string) => {
        const chain = chainInfo['aptos']
        if (!chain?.explorer) {
            logger.error('Missing explorer URL for Aptos chain')
            return ''
        }

        if (accountId === 'savings-2') {
            return `${chain.explorer}/account/${publicKey}/transactions?network=mainnet`
        }
        return `${chain.explorer}/account/${publicKey}`
    },
    BalanceDisplayComponent: AptosTokenBalance,
})

// Export the handler interface
export const aptosHandler: ChainHandler = aptosHandlerInstance

// Export cleanup function for tests and hot reloading
export const clearCache = () => aptosHandlerInstance.clearCache()
