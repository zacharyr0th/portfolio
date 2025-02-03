// Token mappings and configuration for Aptos chain
import type { TokenPrice } from './types'

// Known token mappings for Aptos with full addresses
export const TOKEN_SYMBOL_MAP: Readonly<
    Record<string, { symbol: string; name: string; decimals: number }>
> = Object.freeze({
    '0x1::aptos_coin::AptosCoin': { symbol: 'APT', name: 'Aptos', decimals: 8 },
    '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt': {
        symbol: 'STAPT',
        name: 'Staked Aptos',
        decimals: 8,
    },
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
    },
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT': {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
    },
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH': {
        symbol: 'WETH',
        name: 'Wrapped Ethereum',
        decimals: 8,
    },
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC': {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        decimals: 8,
    },
})

// Default price object for tokens without price data
export const DEFAULT_PRICE: Readonly<TokenPrice> = Object.freeze({
    price: 0,
    priceChange24h: 0,
})

// Spam token detection patterns
export const SPAM_PATTERNS = [
    /test/i,
    /faucet/i,
    /airdrop/i,
    /\bscam\b/i,
    /\bfake\b/i,
    /\bdemo\b/i,
] as const

// RPC endpoints for Aptos network
export const RPC_ENDPOINTS = [
    'https://api.mainnet.aptoslabs.com/v1',
    'https://fullnode.mainnet.aptoslabs.com/v1',
    'https://aptos-mainnet.nodereal.io/v1',
] as const

// Token decimals mapping
export const TOKEN_DECIMALS: Readonly<Record<string, number>> = Object.freeze({
    APT: 8,
    STAPT: 8,
    USDC: 6,
    USDT: 6,
    WETH: 8,
    WBTC: 8,
})
