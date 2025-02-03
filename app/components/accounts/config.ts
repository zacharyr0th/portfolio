import type { WalletAccount } from './cards/types'
import { logger } from '@/lib/utils/core/logger'

// Helper to create wallet config with improved type safety
const createWalletConfig = (
    id: string,
    name: string,
    chain: ChainType,
    publicKey: string
): Readonly<WalletAccount> => ({
    id,
    name,
    type: 'wallet' as const,
    chain,
    status: 'active' as const,
    publicKey,
    value: 0,
    lastUpdated: new Date().toISOString(),
})

// Supported chain identifiers with type safety
export const SUPPORTED_CHAINS = ['aptos', 'solana', 'sui'] as const satisfies readonly string[]
export type ChainType = (typeof SUPPORTED_CHAINS)[number]

// Function to dynamically generate wallet configurations from environment variables
function generateWalletConfigs(): Record<string, Record<string, WalletAccount>> {
    const walletConfigs = {
        solana: {} as Record<string, WalletAccount>,
        aptos: {} as Record<string, WalletAccount>,
        sui: {} as Record<string, WalletAccount>,
    }

    // Get all environment variables
    const envVars = process.env || {}
    
    // Debug: Log environment variables related to wallets
    logger.debug('Found wallet environment variables:', {
        solana: Object.keys(envVars).filter(key => key.startsWith('SOLANA_WALLET')),
        aptos: Object.keys(envVars).filter(key => key.startsWith('APTOS_WALLET')),
        sui: Object.keys(envVars).filter(key => key.startsWith('SUI_WALLET')),
    })

    // Process each environment variable for wallets
    Object.entries(envVars).forEach(([key, value]) => {
        if (!value || value === 'your_solana_wallet_address' || 
            value === 'your_aptos_wallet_address' || 
            value === 'your_sui_wallet_address') {
            logger.debug(`Skipping placeholder wallet value for ${key}`)
            return
        }

        // Match wallet public keys by prefix
        const solanaMatch = key.match(/^SOLANA_WALLET_(.+)$/)
        const aptosMatch = key.match(/^APTOS_WALLET_(.+)$/)
        const suiMatch = key.match(/^SUI_WALLET_(.+)$/)

        try {
            if (solanaMatch?.[1]) {
                const name = solanaMatch[1] // Use the exact name from env var
                const id = `sol-${name.toLowerCase()}`
                walletConfigs.solana[id] = createWalletConfig(id, name, 'solana', value)
                logger.debug(`Created Solana wallet config:`, { id, name, publicKey: value })
            }
            else if (aptosMatch?.[1]) {
                const name = aptosMatch[1]
                const id = `apt-${name.toLowerCase()}`
                walletConfigs.aptos[id] = createWalletConfig(id, name, 'aptos', value)
                logger.debug(`Created Aptos wallet config:`, { id, name, publicKey: value })
            }
            else if (suiMatch?.[1]) {
                const name = suiMatch[1]
                const id = `sui-${name.toLowerCase()}`
                walletConfigs.sui[id] = createWalletConfig(id, name, 'sui', value)
                logger.debug(`Created Sui wallet config:`, { id, name, publicKey: value })
            }
        } catch (error) {
            logger.error(`Error creating wallet config for ${key}:`, error instanceof Error ? error : new Error(String(error)))
        }
    })

    // Debug: Log final configurations
    logger.debug('Generated wallet configurations:', {
        solanaCount: Object.keys(walletConfigs.solana).length,
        aptosCount: Object.keys(walletConfigs.aptos).length,
        suiCount: Object.keys(walletConfigs.sui).length,
        configs: walletConfigs
    })

    return walletConfigs
}

// Main account configuration with improved type safety
export const accountConfig = {
    wallets: generateWalletConfigs(),
    banks: {},
    brokers: {},
    cex: {
        kraken: {
            id: 'kraken-main',
            platform: 'Kraken' as const,
            type: 'cex' as const,
            name: 'Kraken',
            value: 0,
            lastUpdated: new Date().toISOString(),
        },
        gemini: {
            id: 'gemini-main',
            platform: 'Gemini' as const,
            type: 'cex' as const,
            name: 'Gemini',
            value: 0,
            lastUpdated: new Date().toISOString(),
        },
    },
    credit: {},
    debit: {},
} as const

// Export individual account sections
export const { wallets, banks, brokers, cex, credit: creditAccounts, debit: debitAccounts } = accountConfig

// Function to fetch wallet configurations
export async function getWalletConfigs(): Promise<Record<string, Record<string, WalletAccount>>> {
    try {
        const response = await fetch('/api/accounts')
        if (!response.ok) {
            throw new Error('Failed to fetch wallet configurations')
        }
        return response.json()
    } catch (error) {
        logger.error('Failed to fetch wallet configurations:', error as Error)
        return generateWalletConfigs() // Fallback to environment-based config
    }
}
