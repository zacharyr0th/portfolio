import React from 'react'
import type { TokenBalance, TokenPrice } from '../types'
import { Icon } from '@/app/components/accounts/cards/Icon'
import { getTokenIcon } from '@/app/components/accounts/cards/constants'

interface TokenBalanceProps {
    balance: TokenBalance
    prices: Record<string, TokenPrice>
    showPrice?: boolean
    showChange?: boolean
}

export const GeminiTokenBalance: React.FC<TokenBalanceProps> = ({
    balance,
    prices,
    showPrice = true,
    showChange = false,
}) => {
    const { token } = balance
    const formattedBalance = Number(balance.balance)
    const price = prices[token.symbol]?.price ?? 0
    const priceChange = prices[token.symbol]?.priceChange24h ?? 0
    const usdValue = price * formattedBalance
    const tokenIcon = getTokenIcon(token.symbol)

    return (
        <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
                {tokenIcon && (
                    <Icon
                        type="image"
                        src={tokenIcon.src}
                        alt={`${token.symbol} icon`}
                        opacity={tokenIcon.opacity}
                        className="h-4 w-4"
                    />
                )}
                <span className="font-medium text-white">{token.symbol}</span>
                <span className="text-muted-foreground/70">
                    {formattedBalance.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    })}{' '}
                    @ $
                    {price.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    })}
                </span>
            </div>
            {showPrice && (
                <div className="flex items-center gap-1.5">
                    <span className="font-medium">${Math.round(usdValue).toLocaleString()}</span>
                    {showChange && (
                        <span className={`${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {priceChange >= 0 ? '+' : ''}
                            {Math.round(priceChange)}%
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
