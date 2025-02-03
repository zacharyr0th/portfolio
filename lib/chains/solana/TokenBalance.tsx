import React, { useMemo } from 'react'
import { formatNumber } from './utils'
import type { BalanceDisplayProps } from '../types'
import { TOKEN_THRESHOLDS } from './constants'

interface FormatOptions {
    style?: 'currency' | 'decimal'
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    currency?: string
    compact?: boolean
}

const formatValue = (value: number, options: FormatOptions = {}) => {
    const defaultOptions: FormatOptions = {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
        compact: false,
    }

    return formatNumber(value, { ...defaultOptions, ...options })
}

export const SolanaTokenBalance: React.FC<BalanceDisplayProps> = ({
    balance,
    prices,
    showPrice = true,
    showChange = true,
}) => {
    const { token, balance: rawBalance } = balance
    const { symbol, decimals } = token
    const verified = 'verified' in token ? token.verified : undefined
    const price = prices[symbol]

    // Memoize calculations
    const { balanceNum, formattedBalance, usdValue, formattedUsdValue, priceChange, formattedPriceChange } = useMemo(() => {
        // Use uiAmount if available, otherwise calculate
        const balanceNum = ('uiAmount' in balance ? balance.uiAmount : undefined) ?? parseFloat(rawBalance) / Math.pow(10, decimals)
        
        // Format balance based on token value
        const formattedBalance = formatValue(balanceNum, {
            maximumFractionDigits: balanceNum < 1 ? decimals : 2,
            minimumFractionDigits: 0,
        })

        // Calculate USD value
        const usdValue = price ? balanceNum * price.price : 0
        const formattedUsdValue = formatValue(usdValue, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })

        // Format price change
        const priceChange = price?.priceChange24h || 0
        const formattedPriceChange = formatValue(Math.abs(priceChange), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })

        return {
            balanceNum,
            formattedBalance,
            usdValue,
            formattedUsdValue,
            priceChange,
            formattedPriceChange,
        }
    }, [rawBalance, decimals, balance, price])

    // Don't render if balance is below threshold
    if (balanceNum <= TOKEN_THRESHOLDS.DISPLAY.MIN_AMOUNT && 
        usdValue <= TOKEN_THRESHOLDS.DISPLAY.MIN_VALUE_USD) {
        return null
    }

    return (
        <div className="flex flex-col">
            <div className="flex items-center space-x-2">
                <span className="font-medium">{formattedBalance}</span>
                <span className="text-gray-500 flex items-center gap-1">
                    {symbol}
                    {verified && (
                        <svg className="w-3 h-3 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    )}
                </span>
            </div>
            {showPrice && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{formattedUsdValue}</span>
                    {showChange && price && (
                        <span className={`text-xs ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                            {priceChange >= 0 ? '↑' : '↓'} {formattedPriceChange}%
                            {'confidence' in price && price.confidence && price.confidence < 0.5 && (
                                <span title="Low confidence price" className="ml-1 opacity-50">⚠️</span>
                            )}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
} 