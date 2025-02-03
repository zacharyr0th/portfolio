import type {
    BankAccount,
    BrokerAccount,
    CexAccount,
    CreditAccount,
    DebitAccount,
    WalletAccount,
} from './types'
import { WalletCard } from './variants/WalletCard'
import { CexCard } from './variants/CexCard'
import { BrokerCard } from './variants/BrokerCard'
import { BankCard } from './variants/BankCard'
import { CreditCard } from './variants/CreditCard'
import { DebitCard } from './variants/DebitCard'
import type { SharedCardProps } from './types'
import type {
    BankPlatform,
    BrokerPlatform,
    CexPlatform,
    CreditPlatform,
    DebitPlatform,
} from './types'
import { isValidChain, type ChainType } from '@/lib/chains'
import { logger } from '@/lib/utils/core/logger'

// Re-export shared types and constants
export * from './types'
export * from './constants'

interface AccountCardProps extends SharedCardProps {}

function assertWalletChain(account: WalletAccount) {
    return isValidChain(account.chain) ? { ...account, chain: account.chain as ChainType } : null
}
function assertBankPlatform(account: BankAccount) {
    return { ...account, platform: account.platform as BankPlatform }
}
function assertBrokerPlatform(account: BrokerAccount) {
    return { ...account, platform: account.platform as BrokerPlatform }
}
function assertCexPlatform(account: CexAccount) {
    return { ...account, platform: account.platform as CexPlatform }
}
function assertCreditPlatform(account: CreditAccount) {
    return { ...account, platform: account.platform as CreditPlatform }
}
function assertDebitPlatform(account: DebitAccount) {
    return { ...account, platform: account.platform as DebitPlatform }
}

export function AccountCard({
    account,
    compact = false,
    isExpanded = false,
    onUpdateValue,
}: AccountCardProps) {
    switch (account.type) {
        case 'wallet': {
            const walletAccount = assertWalletChain(account)
            if (!walletAccount) return null
            return (
                <WalletCard
                    account={walletAccount}
                    compact={compact}
                    isExpanded={isExpanded}
                    onUpdateValue={onUpdateValue}
                />
            )
        }
        case 'cex':
            return (
                <CexCard
                    account={assertCexPlatform(account)}
                    compact={compact}
                    isExpanded={isExpanded}
                    onUpdateValue={onUpdateValue}
                />
            )
        case 'broker':
            return (
                <BrokerCard
                    account={assertBrokerPlatform(account)}
                    compact={compact}
                    isExpanded={isExpanded}
                />
            )
        case 'bank':
            return (
                <BankCard
                    account={assertBankPlatform(account)}
                    compact={compact}
                    isExpanded={isExpanded}
                />
            )
        case 'credit':
            return (
                <CreditCard
                    account={assertCreditPlatform(account)}
                    compact={compact}
                    isExpanded={isExpanded}
                />
            )
        case 'debit':
            return (
                <DebitCard
                    account={assertDebitPlatform(account)}
                    compact={compact}
                    isExpanded={isExpanded}
                />
            )
        default: {
            logger.error('Unknown account type:', account)
            return null
        }
    }
}
