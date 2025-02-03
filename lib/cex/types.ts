import { ReactNode } from 'react'

export interface Token {
    symbol: string
    name: string
    decimals: number
}

export interface TokenBalance {
    token: Token
    balance: string
}

export interface TokenPrice {
    price: number
    priceChange24h: number
}

export interface ExchangeHandler {
    fetchBalances: () => Promise<{ balances: TokenBalance[] }>
    fetchPrices: () => Promise<Record<string, TokenPrice>>
    BalanceDisplay: React.FC<{
        balance: TokenBalance
        prices: Record<string, TokenPrice>
        showPrice?: boolean
        showChange?: boolean
    }>
    TokenIcon?: React.FC<{ symbol: string }>
}
