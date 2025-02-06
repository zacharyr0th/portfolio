import { accountConfig, getWalletConfigs } from '@/app/components/accounts/config'
import type { WalletAccount, BankAccount, BrokerAccount, CexAccount, Account } from './cards/types'
import { logger } from '@/lib/utils/core/logger'
import { SUPPORTED_CHAINS } from './config'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const accountCache = new Map<string, {
    data: any
    timestamp: number
}>()

export class AccountService {
    private static readonly defaultLastUpdated = new Date().toISOString()
    private static retryCount = 0
    private static readonly MAX_RETRIES = 3
    private static readonly RETRY_DELAY = 1000

    private static async withCache<T>(
        key: string,
        fetchFn: () => Promise<T>,
        duration: number = CACHE_DURATION
    ): Promise<T> {
        const now = Date.now()
        const cached = accountCache.get(key)

        if (cached && (now - cached.timestamp) < duration) {
            return cached.data as T
        }

        try {
            const data = await fetchFn()
            accountCache.set(key, { data, timestamp: now })
            return data
        } catch (error) {
            if (cached) {
                logger.warn('Failed to fetch fresh data', {
                    key,
                    error: error instanceof Error ? error.message : String(error)
                })
                return cached.data as T
            }
            throw error
        }
    }

    private static addDefaultFields<T extends Partial<Account>>(account: T): T & { value: number; lastUpdated: string } {
        return {
            ...account,
            value: 0,
            lastUpdated: this.defaultLastUpdated,
        }
    }

    private static async fetchWithRetry<T>(
        key: string,
        fetchFn: () => Promise<T>
    ): Promise<T> {
        try {
            return await fetchFn()
        } catch (error) {
            if (this.retryCount < this.MAX_RETRIES) {
                this.retryCount++
                const delay = this.RETRY_DELAY * Math.pow(2, this.retryCount - 1)
                logger.warn(`Retrying fetch for ${key} in ${delay}ms (attempt ${this.retryCount})`)
                await new Promise(resolve => setTimeout(resolve, delay))
                return this.fetchWithRetry(key, fetchFn)
            }
            throw error
        } finally {
            this.retryCount = 0
        }
    }

    static async getWalletAccounts(): Promise<WalletAccount[]> {
        return this.withCache('wallets', async () => {
            try {
                const response = await this.fetchWithRetry('wallet-configs', () => 
                    fetch('/api/accounts')
                )
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch wallet configurations: ${response.statusText}`)
                }

                const configs = await response.json()
                
                return SUPPORTED_CHAINS.flatMap(chain => 
                    Object.values(configs[chain] || {})
                        .map(wallet => this.addDefaultFields(wallet as WalletAccount))
                )
            } catch (error) {
                logger.error('Failed to load wallet accounts:', error instanceof Error ? error : new Error(String(error)))
                return []
            }
        })
    }

    static getBankAccounts(): BankAccount[] {
        return Object.values(accountConfig.banks)
            .map(bank => this.addDefaultFields(bank as BankAccount))
    }

    static getBrokerAccounts(): BrokerAccount[] {
        return Object.values(accountConfig.brokers)
            .map(broker => this.addDefaultFields(broker as BrokerAccount))
    }

    static getCexAccounts(): CexAccount[] {
        return Object.values(accountConfig.cex)
            .map(cex => this.addDefaultFields(cex as CexAccount))
    }

    static getCreditAccounts(): Account[] {
        return Object.values(accountConfig.credit || {})
            .map(credit => this.addDefaultFields(credit as Account))
    }

    static async getAllAccounts(): Promise<Account[]> {
        return this.withCache('all-accounts', async () => {
            const [wallets, banks, brokers, cex, credit] = await Promise.all([
                this.getWalletAccounts(),
                this.getBankAccounts(),
                this.getBrokerAccounts(),
                this.getCexAccounts(),
                this.getCreditAccounts(),
            ])
            return [...wallets, ...banks, ...brokers, ...cex, ...credit]
        })
    }

    static async getAccountById(id: string): Promise<Account | undefined> {
        const accounts = await this.getAllAccounts()
        return accounts.find(account => account.id === id)
    }

    static async getAccountsByType(type: Account['type']): Promise<Account[]> {
        const accounts = await this.getAllAccounts()
        return accounts.filter(account => account.type === type)
    }

    static async getActiveWalletsByChain(chain: WalletAccount['chain']): Promise<WalletAccount[]> {
        const wallets = await this.getWalletAccounts()
        return wallets.filter(wallet => wallet.chain === chain && wallet.status === 'active')
    }

    // Cache cleanup method
    static cleanupCache(): void {
        const now = Date.now()
        for (const [key, value] of accountCache.entries()) {
            if (now - value.timestamp > CACHE_DURATION) {
                accountCache.delete(key)
            }
        }
    }
}

// Set up periodic cache cleanup
setInterval(() => AccountService.cleanupCache(), CACHE_DURATION)

export const getInitialAccounts = AccountService.getAllAccounts

export const {
    getWalletAccounts,
    getBankAccounts,
    getBrokerAccounts,
    getCexAccounts,
} = AccountService
