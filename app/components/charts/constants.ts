export const CHART_COLORS = {
    primary: '#86EFAC',   // Muted Green
    secondary: '#93C5FD', // Muted Blue
    muted: '#9CA3AF',     // Muted Gray
} as const

// Base muted color palette for dynamic asset allocation
export const ASSET_COLORS = {
    // Water-inspired blues
    blue1: '#5B7A8D',    // Darker pond blue
    blue2: '#6E8EA2',    // Darker sky blue
    blue3: '#839FB1',    // Darker water blue
    
    // Garden greens
    green1: '#4C857A',   // Darker lily pad
    green2: '#638F81',   // Darker sage
    green3: '#779B8B',   // Darker garden
    
    // Sunset purples
    purple1: '#776D80',  // Darker evening purple
    purple2: '#8B7F8E',  // Darker twilight
    purple3: '#9F91A4',  // Darker lilac
    
    // Water reflections
    teal1: '#557779',    // Darker deep water
    teal2: '#698C8E',    // Darker reflection
    teal3: '#7D9FA1',    // Darker mist
    
    // Stone greys
    slate1: '#6E7683',   // Darker bridge stone
    slate2: '#808890',   // Darker fog
    slate3: '#929AA2',   // Darker morning
    
    // Garden path greens
    forest1: '#5C766D',  // Darker garden path
    forest2: '#70867D',  // Darker morning garden
    forest3: '#84968D',  // Darker foliage
    
    // Sunset golds
    bronze1: '#887969',  // Darker evening gold
    bronze2: '#998B7B',  // Darker sunset
    bronze3: '#AA9D8D',  // Darker morning light
    
    // Rose pinks
    crimson1: '#8E7171', // Darker rose garden
    crimson2: '#9D8282', // Darker soft rose
    crimson3: '#AC9393', // Darker morning rose
} as const

export const COLORS = {
    // Categories
    Wallets: ASSET_COLORS.slate2,     // Darker stone
    CEX: ASSET_COLORS.purple2,        // Darker twilight
    Brokers: ASSET_COLORS.forest2,    // Darker garden path
    Banks: ASSET_COLORS.blue2,        // Darker water

    // Chains
    Solana: ASSET_COLORS.green1,      // Darker lily pad
    Aptos: ASSET_COLORS.blue1,        // Darker pond
    Sui: ASSET_COLORS.forest3,        // Darker garden

    // Platforms
    Kraken: ASSET_COLORS.crimson2,    // Darker rose
    Gemini: ASSET_COLORS.teal2,       // Darker reflection

    // Common Assets
    BTC: ASSET_COLORS.bronze2,        // Darker gold
    ETH: ASSET_COLORS.blue2,          // Darker water
    SOL: ASSET_COLORS.green1,         // Darker lily pad
    APT: ASSET_COLORS.blue1,          // Darker pond
    SUI: ASSET_COLORS.forest3,        // Darker garden
    USDC: ASSET_COLORS.teal1,         // Darker deep water
    USDT: ASSET_COLORS.green2,        // Darker sage

    // Fallback
    Other: '#808890'                  // Darker mist
} as const

// Helper function to get color for any asset
export const getAssetColor = (assetSymbol: string): string => {
    const normalizedSymbol = assetSymbol.toUpperCase()

    // Check for exact match in COLORS
    if (normalizedSymbol in COLORS) {
        return COLORS[normalizedSymbol as keyof typeof COLORS]
    }

    // Check for common prefixes (e.g., "WBTC" should use BTC color)
    const commonPrefixes = ['W', 'S', 'C', 'B'] // Wrapped, Staked, Compound, Bridged
    for (const prefix of commonPrefixes) {
        const baseSymbol = normalizedSymbol.startsWith(prefix) ? normalizedSymbol.slice(1) : normalizedSymbol
        if (baseSymbol in COLORS) {
            return COLORS[baseSymbol as keyof typeof COLORS]
        }
    }

    // Hash the symbol to consistently pick a color from ASSET_COLORS
    const hash = Array.from(normalizedSymbol).reduce(
        (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0
    )

    // Use modulo to select a color family (blue, green, purple, etc.)
    const colorFamilies = [
        ['blue1', 'blue2', 'blue3'],
        ['green1', 'green2', 'green3'],
        ['purple1', 'purple2', 'purple3'],
        ['teal1', 'teal2', 'teal3'],
        ['slate1', 'slate2', 'slate3'],
        ['forest1', 'forest2', 'forest3'],
        ['bronze1', 'bronze2', 'bronze3'],
        ['crimson1', 'crimson2', 'crimson3'],
    ] as const

    const family = colorFamilies[Math.abs(hash) % colorFamilies.length]
    const colorKey = family?.[Math.abs(hash >> 8) % 3] as keyof typeof ASSET_COLORS || 'blue1'

    return ASSET_COLORS[colorKey]
}

export const PORTFOLIO_CATEGORIES = ['Wallets', 'CEX', 'Brokers', 'Banks'] as const

export const CATEGORY_TO_TYPE_MAP = {
    DeFi: 'defi',
    Tradfi: 'tradfi',
    Yields: 'yields',
    Assets: 'assets',
} as const

export const TABS = [
    { value: 'portfolio', label: 'Portfolio' },
    { value: 'chains', label: 'Chains' },
    { value: 'platforms', label: 'Platforms' },
    { value: 'assets', label: 'Assets' },
] as const

export type TabValue = (typeof TABS)[number]['value']
export type CategoryType = keyof typeof CATEGORY_TO_TYPE_MAP

// Gradient definitions for enhanced visuals
export const GRADIENTS = {
    // Portfolio Categories
    Wallets: ['#64748B', '#7B8BA2'],
    CEX: ['#7C6F95', '#9386AC'],
    Brokers: ['#57876C', '#6E9E83'],
    Banks: ['#525964', '#69707B'],

    // Major Chains
    Ethereum: ['#4B6B95', '#6282AC'],
    Bitcoin: ['#8A7452', '#A18B69'],
    Solana: ['#4B8573', '#629C8A'],
    Polygon: ['#735891', '#8A6FA8'],
    Avalanche: ['#8A5959', '#A17070'],
    Binance: ['#8A7452', '#A18B69'],
    Aptos: ['#4B6B95', '#6282AC'],
    Sui: ['#6B5C8A', '#8273A1'],
    Near: ['#4A7D85', '#61949C'],
    Fantom: ['#535B8A', '#6A72A1'],
    Arbitrum: ['#4A7185', '#61889C'],
    Optimism: ['#855A5A', '#9C7171'],

    // Major Platforms
    Coinbase: ['#4B6B95', '#6282AC'],
    Kraken: ['#6B5C8A', '#8273A1'],
    Gemini: ['#4A7D85', '#61949C'],
    FTX: ['#4B8573', '#629C8A'],
    Robinhood: ['#57876C', '#6E9E83'],
    MetaMask: ['#8A6952', '#A18069'],
    Phantom: ['#735891', '#8A6FA8'],
    TrustWallet: ['#4A7185', '#61889C'],

    // Fallback
    Other: ['#5F6571', '#767D88']
} as const

// Chart dimensions for different screen sizes
export const CHART_DIMENSIONS = {
    sm: {
        width: 300,
        height: 300,
        outerRadius: 100,
        innerRadius: 60,
    },
    md: {
        width: 400,
        height: 400,
        outerRadius: 150,
        innerRadius: 90,
    },
    lg: {
        width: 500,
        height: 500,
        outerRadius: 200,
        innerRadius: 120,
    },
} as const

// Animation timing configurations
export const ANIMATION = {
    duration: 800,
    easing: 'ease-out',
    delay: 150,
} as const

// Hover and active state configurations
export const INTERACTION = {
    hoverScale: 1.02,
    activeScale: 1.05,
    hoverOpacity: 0.8,
    inactiveOpacity: 0.3,
    transitionDuration: 300,
} as const
