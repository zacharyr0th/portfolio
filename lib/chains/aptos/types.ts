export interface AptosToken {
    symbol: string
    name: string
    decimals: number
    tokenAddress: string
    chainId?: number
}

export interface TokenBalance {
    token: AptosToken
    balance: string
}

export interface TokenPrice {
    price: number
    priceChange24h: number
}

export interface AccountResource {
    type: string
    data: any
}

export interface AptosAccountResponse {
    sequence_number: string
    authentication_key: string
    balances?: TokenBalance[]
}
