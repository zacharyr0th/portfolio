import type { SolanaToken } from './types'

// Well-known token addresses
export const SOLANA_TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    BEENZ: '9sbrLLnk4vxJajnZWXP9h5qk1NDFw7dz2eHjgemcpump',
} as const

// Known token mappings with metadata
export const TOKEN_SYMBOL_MAP: Readonly<Record<string, SolanaToken>> = Object.freeze({
    [SOLANA_TOKENS.SOL]: {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        tokenAddress: SOLANA_TOKENS.SOL,
        chainId: 101,
        verified: true,
    },
    [SOLANA_TOKENS.USDC]: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        tokenAddress: SOLANA_TOKENS.USDC,
        chainId: 101,
        verified: true,
        tags: ['stablecoin'],
    },
    [SOLANA_TOKENS.USDT]: {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        tokenAddress: SOLANA_TOKENS.USDT,
        chainId: 101,
        verified: true,
        tags: ['stablecoin'],
    },
    [SOLANA_TOKENS.BEENZ]: {
        symbol: 'BEENZ',
        name: 'BEENZ',
        decimals: 6,
        tokenAddress: SOLANA_TOKENS.BEENZ,
        chainId: 101,
        verified: true,
    },
})

// Default values
export const DEFAULT_PRICE = {
    price: 0,
    priceChange24h: 0,
    lastUpdated: 0,
    confidence: 0,
}

// Program IDs
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112'
export const ASSOCIATED_TOKEN = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'

// RPC Configuration
export const RPC_CONFIG = {
    ENDPOINTS: [
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.ankr.com/solana',
    ],
    COMMITMENT: 'confirmed' as const,
    TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
} as const

// Token thresholds
export const TOKEN_THRESHOLDS = {
    DUST: {
        SOL: 0.000001, // 1000 lamports
        STABLECOIN: 0.01, // $0.01 for stablecoins
        DEFAULT: 0.000001, // Default minimum for other tokens
    },
    DISPLAY: {
        MIN_VALUE_USD: 0.01, // Minimum USD value to display
        MIN_AMOUNT: 0.000001, // Minimum token amount to display
    },
} as const 