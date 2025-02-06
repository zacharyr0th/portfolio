import { createCache } from '@/lib/utils/core/performance'
import { logger } from '@/lib/utils/core/logger'

// Types
export interface NFTAttribute {
    trait_type: string
    value: string
}

export interface NFTCollection {
    name: string
    description: string
    image_url: string
}

export interface NFTFloorPrice {
    value: number
    currency: string
}

export interface NFTMetadata {
    name: string
    description: string
    image_url: string
    collection: NFTCollection
    attributes: NFTAttribute[]
}

export interface NFTBalance {
    token_id: string
    contract_address: string
    chain: string
    name: string
    description: string
    image_url: string
    collection: NFTCollection
    floor_price?: NFTFloorPrice
}

// Constants
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const REQUEST_TIMEOUT = 10000 // 10 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second
const BASE_URL = 'https://api.simplehash.com/api/v0'

// Chain mapping
const CHAIN_MAPPING = {
    'aptos': 'aptos',
    'solana': 'solana',
    'sui': 'sui',
    'ethereum': 'ethereum',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base'
} as const

// Cache configuration
const CACHE_CONFIG = {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxItems: 1000,
    namespace: 'nft-data',
} as const

// Initialize cache
const cache = createCache(CACHE_CONFIG)

// Helper: Delay between retries
const delay = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms))

// Helper: Retry operation with exponential backoff
async function retryOperation<T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES,
    delayMs: number = RETRY_DELAY
): Promise<T> {
    try {
        return await operation()
    } catch (error) {
        if (retries > 0) {
            await delay(delayMs)
            return retryOperation(operation, retries - 1, delayMs * 2)
        }
        throw error
    }
}

// Helper: Make API request with timeout
async function makeRequest<T>(url: string): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
        const response = await fetch(url, {
            headers: {
                'X-API-KEY': process.env.SIMPLEHASH_API_KEY || '',
                'Accept': 'application/json',
            },
            signal: controller.signal,
            next: { revalidate: CACHE_TTL / 1000 },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        return response.json()
    } finally {
        clearTimeout(timeoutId)
    }
}

// Helper: Get chain identifier
function getChainIdentifier(chain: string): string {
    const mappedChain = CHAIN_MAPPING[chain.toLowerCase() as keyof typeof CHAIN_MAPPING]
    if (!mappedChain) {
        throw new Error(`Unsupported chain: ${chain}`)
    }
    return mappedChain
}

// Fetch NFTs for a wallet
export async function fetchWalletNFTs(
    walletAddress: string,
    chain: string
): Promise<NFTBalance[]> {
    const chainId = getChainIdentifier(chain)
    const cacheKey = `nfts-${chainId}-${walletAddress}`
    
    try {
        // Check cache first
        const cached = cache.get(cacheKey)
        if (cached && Array.isArray(cached)) {
            return cached as NFTBalance[]
        }

        // Fetch from API with retry
        const response = await retryOperation(() => 
            makeRequest<{ nfts: any[] }>(
                `${BASE_URL}/nfts/owners_v2?chains=${chainId}&wallet_addresses=${walletAddress}`
            )
        )

        // Transform and normalize data
        const nfts: NFTBalance[] = response.nfts.map(nft => ({
            token_id: nft.token_id,
            contract_address: nft.contract_address,
            chain: nft.chain,
            name: nft.name || '',
            description: nft.description || '',
            image_url: nft.image_url || '',
            collection: {
                name: nft.collection?.name || '',
                description: nft.collection?.description || '',
                image_url: nft.collection?.image_url || '',
            },
            floor_price: nft.collection?.floor_price ? {
                value: Number(nft.collection.floor_price.value),
                currency: nft.collection.floor_price.currency,
            } : undefined,
        }))

        // Cache the results
        cache.set(cacheKey, nfts, CACHE_TTL)
        return nfts
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching NFTs'
        logger.error('Error fetching NFTs', error instanceof Error ? error : undefined, {
            wallet: walletAddress,
            chain: chainId,
        })
        throw error
    }
}

// Fetch specific NFT metadata
export async function fetchNFTMetadata(
    contractAddress: string,
    tokenId: string,
    chain: string
): Promise<NFTMetadata> {
    const chainId = getChainIdentifier(chain)
    const cacheKey = `nft-metadata-${chainId}-${contractAddress}-${tokenId}`
    
    try {
        // Check cache first
        const cached = cache.get(cacheKey)
        if (cached && typeof cached === 'object' && 'name' in cached) {
            return cached as NFTMetadata
        }

        // Fetch from API with retry
        const response = await retryOperation(() => 
            makeRequest<any>(
                `${BASE_URL}/nfts/${chainId}/${contractAddress}/${tokenId}`
            )
        )

        // Transform and normalize data
        const metadata: NFTMetadata = {
            name: response.name || '',
            description: response.description || '',
            image_url: response.image_url || '',
            collection: {
                name: response.collection?.name || '',
                description: response.collection?.description || '',
                image_url: response.collection?.image_url || '',
            },
            attributes: response.attributes?.map((attr: any) => ({
                trait_type: attr.trait_type || '',
                value: String(attr.value || ''),
            })) || [],
        }

        // Cache the results
        cache.set(cacheKey, metadata, CACHE_TTL)
        return metadata
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching NFT metadata'
        logger.error('Error fetching NFT metadata', error instanceof Error ? error : undefined, {
            contract: contractAddress,
            tokenId,
            chain: chainId,
        })
        throw error
    }
} 