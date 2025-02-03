// React imports
import { useEffect, useState } from 'react'

// Local imports
import type { BankAccount } from '../types'
import { cn } from '@/lib/utils'
import { BaseCard, cardStyles } from '../BaseCard'
import { PLATFORM_URLS } from '../constants'
import type { BankPlatform, SharedCardProps } from '../types'

interface BankCardProps extends Omit<SharedCardProps, 'account'> {
    account: Omit<BankAccount, 'platform'> & { platform: BankPlatform }
}

export function BankCard({ account, compact = false, isExpanded = false }: BankCardProps) {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setIsOpen(isExpanded)
    }, [isExpanded])

    const _platformUrl = PLATFORM_URLS.bank[account.platform]

    // Format balances for the table
    const _balances = [
        {
            token: { symbol: 'USD', name: 'US Dollar' },
            quantity: account.value,
            value: account.value,
        },
    ]

    return (
        <BaseCard
            account={account}
            expanded={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            className={isOpen ? 'h-auto' : undefined}
            variant="detailed"
        >
            {!compact && isOpen && (
                <>
                    <div className="flex flex-wrap items-center gap-1">
                        <span className={cn(cardStyles.badge, 'bg-purple-500/20 text-purple-500')}>
                            {account.category}
                        </span>
                    </div>

                    <div className={cardStyles.content}>
                        {account.accountNumber && (
                            <div className={cardStyles.row}>
                                <span className={cardStyles.label}>Account:</span>
                                <code className={cardStyles.code}>
                                    ****{account.accountNumber.slice(-4)}
                                </code>
                            </div>
                        )}
                        {account.routingNumber && (
                            <div className={cardStyles.row}>
                                <span className={cardStyles.label}>Routing:</span>
                                <code className={cardStyles.code}>{account.routingNumber}</code>
                            </div>
                        )}
                        {account.notes && (
                            <div className={cardStyles.row}>
                                <span className={cardStyles.label}>Notes:</span>
                                <span>{account.notes}</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </BaseCard>
    )
}
