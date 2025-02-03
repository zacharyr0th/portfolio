// Jupiter v6 API types
export interface JupiterToken {
    address: string // Token mint address
    chainId: number // Solana chain ID
    decimals: number
    name: string
    symbol: string
    logoURI?: string
    tags?: string[]
    extensions?: {
        coingeckoId?: string
        website?: string
        twitter?: string
    }
}

export interface SolanaToken {
    symbol: string
    name: string
    decimals: number
    tokenAddress: string
    chainId?: number
    logoURI?: string
    tags?: string[]
    verified?: boolean
}

export interface TokenBalance {
    token: SolanaToken
    balance: string
    uiAmount?: number // Human readable amount
}

export interface TokenPrice {
    price: number
    priceChange24h: number
    lastUpdated?: number
    confidence?: number // Price confidence score (0-1)
}

// RPC Response Types
export interface SolanaAccountInfo {
    lamports: number
    owner: string
    executable: boolean
    rentEpoch: number
    data: string | {
        parsed: {
            info: {
                mint: string
                owner: string
                tokenAmount: TokenAccountBalance
            }
            type: string
        }
        program: string
        space: number
    }
}

export interface TokenAccountBalance {
    amount: string
    decimals: number
    uiAmount: number
    uiAmountString: string
}

export interface TokenAccount {
    pubkey: string
    account: {
        data: {
            parsed: {
                info: {
                    mint: string
                    owner: string
                    tokenAmount: TokenAccountBalance
                }
                type: string
            }
            program: string
            space: number
        }
        executable: boolean
        lamports: number
        owner: string
        rentEpoch: number
    }
}

// Price source types
export type PriceSource = 'jupiter' | 'coingecko' | 'cmc'

export interface PriceQuote {
    price: number
    source: PriceSource
    timestamp: number
    confidence?: number
} 
