import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface TokenData {
    symbol: string
    name: string
    decimals: number
}

interface TokenBalanceProps {
    token: TokenData
    quantity: number
    price: number
    icon?: React.ReactNode
    className?: string
}

// Memoized number formatter instances
const formatters = {
    standard: new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    crypto: new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }),
    precise: new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }),
}

function formatNumber(num: number, symbol: string): string {
    if (num === 0) return '0'
    // Use 4 decimals for BTC and ETH
    if (symbol === 'BTC' || symbol === 'ETH' || symbol === 'WBTC' || symbol === 'WETH') {
        return formatters.crypto.format(num)
    }
    // Use 2 decimals for everything else
    return formatters.standard.format(num)
}

function TokenBalanceComponent({ token, quantity, price, className }: TokenBalanceProps) {
    const value = useMemo(() => quantity * price, [quantity, price])
    const formattedQuantity = useMemo(
        () => formatNumber(quantity, token.symbol),
        [quantity, token.symbol]
    )
    const formattedPrice = useMemo(() => formatNumber(price, token.symbol), [price, token.symbol])
    const formattedValue = useMemo(() => formatNumber(value, token.symbol), [value, token.symbol])

    // Early return for zero balances
    if (quantity === 0) return null

    return (
        <div className={cn("grid grid-cols-3 gap-4 items-center", className)}>
            <div className="font-medium text-xs text-left min-w-[80px]">{token.symbol}</div>
            <div className="font-mono text-xs text-muted-foreground text-right min-w-[80px]">
                {formattedQuantity}
            </div>
            <div className="font-medium text-xs text-right min-w-[80px]">
                ${formattedValue}
            </div>
        </div>
    )
}

export const TokenBalance = memo(TokenBalanceComponent)
