import { accountConfig, getWalletConfigs } from '@/app/components/accounts/config'
import type { WalletAccount, BankAccount, BrokerAccount, CexAccount, Account } from './cards/types'
import { logger } from '@/lib/utils/core/logger'

export class AccountService {
    private static readonly defaultLastUpdated = new Date().toISOString()

    private static addDefaultFields<T extends Partial<Account>>(account: T): T & { value: number; lastUpdated: string } {
        return {
            ...account,
            value: 0,
            lastUpdated: this.defaultLastUpdated,
        }
    }

    static async getWalletAccounts(): Promise<WalletAccount[]> {
        try {
            const response = await fetch('/api/accounts')
            if (!response.ok) {
                throw new Error('Failed to fetch wallet configurations')
            }
            const configs = await response.json()
            const chains = ['solana', 'aptos', 'sui'] as const
            
            return chains.flatMap(chain => 
                Object.values(configs[chain] || {})
                    .map(wallet => this.addDefaultFields(wallet as WalletAccount))
            )
        } catch (error) {
            logger.error('Failed to load wallet accounts:', error instanceof Error ? error : new Error(String(error)))
            return []
        }
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
        const [wallets, banks, brokers, cex, credit] = await Promise.all([
            this.getWalletAccounts(),
            this.getBankAccounts(),
            this.getBrokerAccounts(),
            this.getCexAccounts(),
            this.getCreditAccounts(),
        ])
        return [...wallets, ...banks, ...brokers, ...cex, ...credit]
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
}

export const getInitialAccounts = AccountService.getAllAccounts

export const {
    getWalletAccounts,
    getBankAccounts,
    getBrokerAccounts,
    getCexAccounts,
} = AccountService
