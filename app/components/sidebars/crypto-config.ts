export const MARKET_SECTIONS = {
    // Crypto markets (detailed)
    majors: ['BTC', 'ETH', 'XRP', 'SOL', 'BNB'],
    alt_l1: ['APT', 'SUI', 'ADA', 'SEI', 'AVAX'],
    l2: ['HYPE', 'MATIC', 'POL', 'TON', 'OP', 'ARB'],
    ai: ['TAO', 'VIRTUAL', 'AI16Z', 'AIXBT', 'FARTCOIN', 'ZEREBRO', 'SEKOIA'],
    memes: ['TRUMP', 'MELANIA', 'DOGE', 'GUI'],
} as const

// Section title mapping
export const SECTION_TITLES: Record<keyof typeof MARKET_SECTIONS, string> = {
    majors: 'Majors',
    l2: 'L2s',
    alt_l1: 'Alt L1s',
    ai: 'AI',
    memes: 'Memes',
} as const

// Market types grouping
export const MARKET_TYPES = {
    crypto: ['majors', 'l2', 'alt_l1', 'ai', 'memes'] as const,
} as const

// Cache configuration
export const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
export const REFRESH_INTERVAL = 60000 // 1 minute
export const REQUEST_TIMEOUT = 10000 // 10 seconds
