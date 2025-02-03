export interface SuiToken {
    symbol: string
    name: string
    decimals: number
    tokenAddress: string
    chainId?: number
}

export interface TokenBalance {
    token: SuiToken
    balance: string
}

export interface TokenPrice {
    price: number
    priceChange24h: number
}

export interface SuiCoinMetadata {
    decimals: number
    name: string
    symbol: string
    description: string
    iconUrl: string | null
    id: string | null
}

export interface SuiBalance {
    coinType: string
    coinObjectCount: number
    totalBalance: string
    lockedBalance: Record<string, string>
}

export interface SuiCoinPage {
    data: SuiCoin[]
    hasNextPage: boolean
    nextCursor: string | null
}

export interface SuiCoin {
    coinType: string
    coinObjectId: string
    version: string
    digest: string
    balance: string
    previousTransaction: string
}
